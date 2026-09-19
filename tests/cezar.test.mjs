import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, dirname } from 'node:path'
import { spawnSync } from 'node:child_process'
import { manifest, taskHash, state, writeJson, within, git } from '../scripts/cezar-lib.mjs'
import { launchPlan, submitToCockpit, reserveLaunch } from '../scripts/cezar-launch.mjs'
import { verifyTask } from '../scripts/cezar-verify.mjs'

const write = (root, path, content) => { mkdirSync(dirname(resolve(root, path)), { recursive: true }); writeFileSync(resolve(root, path), content) }
function command(root, args) { const r = git(root, args); assert.equal(r.ok, true, r.error); return r.output }
function fixture(t) {
  const root = mkdtempSync(resolve(tmpdir(), 'flow-cezar-test-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  command(root, ['init', '-q', '-b', 'main'])
  command(root, ['config', 'user.name', 'Fixture'])
  command(root, ['config', 'user.email', 'fixture@example.invalid'])
  write(root, '.gitignore', '.local/\n')
  writeJson(resolve(root, '.ai/cezar/config.json'), { baseBranch: 'main', defaultRunner: 'codex' })
  writeJson(resolve(root, 'config/upstream.json'), { cezar: { packageVersion: '0.11.1', commit: '4763447f36b05e0c3934c77798335827f4398de4' } })
  const tasks = ['A01', 'A02', 'B01'].map((id, i) => ({ id, title: `Task ${id}`, owner: 'DATA', estimateHours: 1, priority: 'P0', wave: i, dependsOn: id === 'A02' ? ['A01'] : [], files: [`src/${id}.mjs`, `tests/acceptance/${id}.test.mjs`], acceptance: [`${id} produces the specified output`], status: i === 0 ? 'verified' : 'todo', taskFile: `tasks/${id}.md`, verification: [{ command: 'node', args: ['--test', `tests/acceptance/${id}.test.mjs`] }] }))
  writeJson(resolve(root, 'backlog/backlog.json'), { tasks })
  for (const task of tasks) { write(root, task.taskFile, `# ${task.id}\nImplement the specified output.\n`); write(root, `evidence/tasks/${task.id}.md`, `# ${task.id}\nActual acceptance report for this fixture.\n`) }
  command(root, ['add', '.']); command(root, ['commit', '-qm', 'fixture baseline'])
  return { root, tasks, head: command(root, ['rev-parse', 'HEAD']) }
}
function accept(root, task, commit) {
  writeJson(resolve(root, '.local/completions.json'), { schemaVersion: 1, accepted: { [task.id]: { taskSpecHash: taskHash(root, task), commit, acceptedBy: 'Integrator', acceptedAt: '2026-09-19T12:00:00Z', evidenceFile: `evidence/tasks/${task.id}.md` } } })
}
test('preparation verified never unlocks a dependency without integrator acceptance', t => {
  const { root } = fixture(t)
  const data = state(root)
  assert.equal(data.rows.find(r => r.id === 'A01').state, 'ready')
  assert.equal(data.rows.find(r => r.id === 'A02').state, 'blocked')
})
test('accepted merged commit unlocks next task; changed card invalidates acceptance', t => {
  const { root, tasks, head } = fixture(t)
  accept(root, tasks[0], head)
  assert.equal(state(root).rows.find(r => r.id === 'A02').state, 'ready')
  write(root, tasks[0].taskFile, '# Changed requirement\n')
  const row = state(root).rows.find(r => r.id === 'A02')
  assert.equal(row.state, 'blocked'); assert.match(row.blockers.join(), /changed/)
})
test('accepted commit on an unmerged branch does not satisfy dependencies', t => {
  const { root, tasks } = fixture(t)
  command(root, ['switch', '-qc', 'feature'])
  write(root, 'branch-only.txt', 'not merged')
  command(root, ['add', '.']); command(root, ['commit', '-qm', 'feature'])
  const sha = command(root, ['rev-parse', 'HEAD'])
  command(root, ['switch', '-q', 'main'])
  accept(root, tasks[0], sha)
  assert.equal(state(root).rows.find(r => r.id === 'A02').state, 'blocked')
})
test('manual acceptance cannot bind a changed uncommitted card to an older commit', t => {
  const { root, tasks, head } = fixture(t)
  write(root, tasks[0].taskFile, '# New acceptance requirements\n')
  accept(root, tasks[0], head)
  const row = state(root).rows.find(r => r.id === 'A02')
  assert.equal(row.state, 'blocked'); assert.match(row.blockers.join(), /differs from accepted commit/)
})
test('a stale upstream acceptance also blocks downstream of a previously accepted dependent', t => {
  const { root, tasks } = fixture(t)
  tasks[2].dependsOn = ['A02']
  writeJson(resolve(root, 'backlog/backlog.json'), { tasks })
  command(root, ['add', '.']); command(root, ['commit', '-qm', 'dependency chain'])
  const commit = command(root, ['rev-parse', 'HEAD'])
  writeJson(resolve(root, '.local/completions.json'), { schemaVersion: 1, accepted: Object.fromEntries(tasks.slice(0, 2).map(task => [task.id, { taskSpecHash: taskHash(root, task), commit, acceptedBy: 'Integrator', acceptedAt: '2026-09-19T12:00:00Z', evidenceFile: `evidence/tasks/${task.id}.md` }])) })
  assert.equal(state(root).rows.find(r => r.id === 'B01').state, 'ready')
  write(root, tasks[0].taskFile, '# Changed upstream requirement\n')
  assert.equal(state(root).rows.find(r => r.id === 'B01').state, 'blocked')
})
test('manifest rejects dependency cycles and generic global verification', t => {
  const { root, tasks } = fixture(t)
  tasks[0].dependsOn = ['A02']; writeJson(resolve(root, 'backlog/backlog.json'), { tasks })
  assert.throws(() => manifest(root), /cycle/)
  tasks[0].dependsOn = []; tasks[0].verification = [{ command: 'npm', args: ['run', 'verify'] }]
  writeJson(resolve(root, 'backlog/backlog.json'), { tasks })
  assert.throws(() => manifest(root), /Generic verification/)
})
test('repository paths cannot escape through traversal or a symlink', t => {
  const { root } = fixture(t)
  assert.throws(() => within(root, '../outside', false), /escapes/)
  symlinkSync(tmpdir(), resolve(root, 'escaped'))
  assert.throws(() => within(root, 'escaped'), /Symlink escapes/)
})
test('launch plan does not start agents or create completion state', t => {
  const { root } = fixture(t)
  const plan = launchPlan(root, 'A01')
  assert.equal(plan.transport, 'single_cockpit_api')
  assert.equal(plan.cezarVersion, '0.11.1')
  assert.equal(existsSync(resolve(root, '.local/completions.json')), false)
  assert.throws(() => launchPlan(root, 'A02'), /blocked/)
})
test('parallel launch plans submit to one scoped cockpit after validating repo and version', async t => {
  const { root } = fixture(t), calls = []
  const mockFetch = async (url, options) => {
    calls.push({ url, options })
    const path = new URL(url).pathname
    const payload = path === '/api/v1/health' ? { version: '0.11.1', capabilities: { dispatch: false } }
      : path === '/api/v1/projects' ? { projects: [{ id: 'flow', root, status: 'ok' }] }
      : path.endsWith('/workflows') ? { workflows: [{ name: 'flow-implement-task' }], issues: [] }
      : { id: `run-${calls.length}`, status: 'queued' }
    return { ok: true, json: async () => payload }
  }
  const result = await submitToCockpit(root, launchPlan(root, 'A01'), 'http://127.0.0.1:4321', mockFetch)
  assert.equal(result.projectId, 'flow'); assert.equal(result.status, 'queued')
  assert.equal(calls.at(-1).url, 'http://127.0.0.1:4321/api/v1/p/flow/runs')
  assert.equal(calls.at(-1).options.method, 'POST')
  assert.equal(JSON.parse(calls.at(-1).options.body).worktree, true)
})
test('wrong cockpit version or repository cannot receive a task', async t => {
  const { root } = fixture(t), plan = launchPlan(root, 'A01')
  let writes = 0
  const wrongVersion = async (url, options) => { if (options.method === 'POST') writes++; return { ok: true, json: async () => ({ version: '0.10.0' }) } }
  await assert.rejects(submitToCockpit(root, plan, 'http://127.0.0.1:4321', wrongVersion), /version/)
  const wrongRepo = async (url, options) => { if (options.method === 'POST') writes++; return { ok: true, json: async () => new URL(url).pathname.endsWith('/health') ? { version: '0.11.1', capabilities: { dispatch: false } } : { projects: [] } } }
  await assert.rejects(submitToCockpit(root, plan, 'http://127.0.0.1:4321', wrongRepo), /repository/)
  assert.equal(writes, 0)
})
test('active task ownership blocks overlapping work but permits disjoint tasks', t => {
  const { root, tasks } = fixture(t)
  tasks[2].files = ['src/A01.mjs']
  writeJson(resolve(root, 'backlog/backlog.json'), { tasks })
  writeJson(resolve(root, '.local/cezar/claims/A01.json'), { taskId: 'A01' })
  assert.equal(state(root).rows.find(r => r.id === 'B01').state, 'blocked')
  tasks[2].files = ['src/B01.mjs']; writeJson(resolve(root, 'backlog/backlog.json'), { tasks })
  assert.equal(state(root).rows.find(r => r.id === 'B01').state, 'ready')
})
function implemented(t, { withTest = true, testFails = false, review = 'pass', directoryOwned = false } = {}) {
  const data = fixture(t), { root, tasks } = data, task = tasks[0]
  let head = data.head
  if (directoryOwned) {
    task.files.push('generated/')
    writeJson(resolve(root, 'backlog/backlog.json'), { tasks })
    command(root, ['add', '.']); command(root, ['commit', '-qm', 'declare owned directory'])
    head = command(root, ['rev-parse', 'HEAD'])
  }
  command(root, ['switch', '-qc', 'cez/12345678'])
  const hash = taskHash(root, task)
  writeJson(resolve(root, '.local/current-task.json'), { taskId: task.id, taskSpecHash: hash, baseCommit: head, branch: 'cez/12345678' })
  write(root, `src/${task.id}.mjs`, 'export const add = (a,b) => a+b\n')
  if (withTest) write(root, `tests/acceptance/${task.id}.test.mjs`, `import assert from 'node:assert/strict'; import {add} from '../../src/${task.id}.mjs'; assert.equal(add(2,3),${testFails ? 6 : 5});\n`)
  writeJson(resolve(root, `evidence/tasks/${task.id}.json`), { taskId: task.id, taskSpecHash: hash, assertions: task.acceptance.map(criterion => ({ criterion, passed: true, evidence: 'Real test asserts the function result.' })), limitations: [] })
  writeJson(resolve(root, `evidence/tasks/${task.id}.review.json`), { taskId: task.id, taskSpecHash: hash, verdict: review, findings: [] })
  return data
}
test('missing future test harness fails instead of reporting a successful task', t => {
  const { root } = implemented(t, { withTest: false })
  assert.throws(() => verifyTask(root), /Missing file/)
})
test('real failing task test fails the gate even when self-report and reviewer say pass', t => {
  const { root } = implemented(t, { testFails: true })
  assert.throws(() => verifyTask(root), /Task verification failed/)
})
test('passing specific test writes execution evidence without accepting dependencies', t => {
  const { root } = implemented(t)
  const result = verifyTask(root)
  assert.equal(result.status, 'passed'); assert.equal(result.checks[0].exitCode, 0)
  assert.equal(existsSync(resolve(root, '.local/completions.json')), false)
})
test('a declared directory with a trailing slash owns files created inside it', t => {
  const { root } = implemented(t, { directoryOwned: true })
  write(root, 'generated/nested/migration.mjs', 'export const migration = true\n')
  assert.equal(verifyTask(root).status, 'passed')
})
test('review rejection and code outside the task scope both fail the gate', t => {
  const first = implemented(t, { review: 'changes_requested' })
  assert.throws(() => verifyTask(first.root), /review has not passed/)
  const second = implemented(t)
  write(second.root, 'unrelated.mjs', 'export const unrelated=true\n')
  assert.throws(() => verifyTask(second.root), /outside task ownership/)
})
