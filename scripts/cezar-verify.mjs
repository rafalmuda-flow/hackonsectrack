import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { DEFAULT_ROOT, parseArgs, manifest, taskHash, git, json, writeJson, within, main } from './cezar-lib.mjs'

function runCheck(root, check) {
  // Nested `node --test` must start a real runner, not inherit its parent's IPC test context.
  const { NODE_TEST_CONTEXT, ...env } = process.env
  return spawnSync(check.command, check.args, { cwd: root, env, encoding: 'utf8', timeout: 180000, maxBuffer: 4 * 1024 * 1024 })
}
export function verifyTask(root, { executeCheck = (check) => runCheck(root, check) } = {}) {
  const bound = json(within(root, '.local/current-task.json'))
  const task = manifest(root).byId.get(bound.taskId)
  if (!task || taskHash(root, task) !== bound.taskSpecHash) throw new Error('Bound task contract changed')
  if (git(root, ['branch', '--show-current']).output !== bound.branch) throw new Error('Cezar task branch changed')
  if (!git(root, ['merge-base', '--is-ancestor', bound.baseCommit, 'HEAD']).ok) throw new Error('Task lost its original base commit')
  const assertion = json(within(root, `evidence/tasks/${task.id}.json`))
  if (assertion.taskId !== task.id || assertion.taskSpecHash !== bound.taskSpecHash) throw new Error('Assertion identity/hash mismatch')
  if (!Array.isArray(assertion.assertions)) throw new Error('Missing acceptance assertions')
  for (const criterion of task.acceptance) {
    const match = assertion.assertions.find(a => a.criterion === criterion)
    if (!match || match.passed !== true || typeof match.evidence !== 'string' || match.evidence.trim().length < 8) throw new Error(`Missing evidenced acceptance: ${criterion}`)
  }
  within(root, `evidence/tasks/${task.id}.md`)
  const review = json(within(root, `evidence/tasks/${task.id}.review.json`))
  if (review.taskId !== task.id || review.taskSpecHash !== bound.taskSpecHash || review.verdict !== 'pass' || !Array.isArray(review.findings) || review.findings.some(f => ['blocker', 'major'].includes(f.severity))) throw new Error('Independent step review has not passed')
  const changed = new Set([
    ...git(root, ['diff', '--name-only', bound.baseCommit, 'HEAD']).output.split('\n'),
    ...git(root, ['diff', '--name-only', 'HEAD']).output.split('\n'),
    ...git(root, ['ls-files', '--others', '--exclude-standard']).output.split('\n'),
  ].filter(Boolean))
  const matchPath = (path, pattern) => {
    const escaped = pattern.replace(/\/+$/, '').replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*')
    return new RegExp(`^${escaped}(?:/.*)?$`).test(path)
  }
  for (const path of changed) {
    if (path.startsWith('.local/')) continue
    if (path.startsWith(`evidence/tasks/${task.id}.`)) continue
    if (!task.files.some(pattern => matchPath(path, pattern))) throw new Error(`Changed file outside task ownership: ${path}`)
  }
  const checks = []
  for (const check of task.verification) {
    // A missing future harness is a red gate, never a successful no-op.
    const testPaths = check.args.filter(a => /\.(test|spec)\.[cm]?[jt]sx?$/.test(a) && !a.startsWith('-'))
    for (const path of testPaths) within(root, path)
    const startedAt = new Date().toISOString(), result = executeCheck(check)
    checks.push({ command: check.command, args: check.args, exitCode: result.status, startedAt, finishedAt: new Date().toISOString() })
    if (result.error || result.status !== 0) {
      writeJson(resolve(root, `.local/cezar/results/${task.id}.json`), { taskId: task.id, taskSpecHash: bound.taskSpecHash, status: 'failed', checks })
      throw new Error(`Task verification failed: ${check.command} ${check.args.join(' ')}; ${result.error?.message ?? result.stderr?.slice(-1000) ?? ''}`)
    }
  }
  const output = { taskId: task.id, taskSpecHash: bound.taskSpecHash, status: 'passed', headCommit: git(root, ['rev-parse', 'HEAD']).output, checkedAt: new Date().toISOString(), checks, note: 'Task checks and synthetic review passed; integrator acceptance and merge are separate.' }
  writeJson(resolve(root, `.local/cezar/results/${task.id}.json`), output)
  return output
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) main(() => {
  const { options } = parseArgs(process.argv.slice(2))
  console.log(JSON.stringify(verifyTask(options.root ?? DEFAULT_ROOT), null, 2))
})
