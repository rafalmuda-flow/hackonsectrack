import { mkdtempSync, cpSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { DEFAULT_ROOT, parseArgs, json, within, git, writeJson, main } from './cezar-lib.mjs'

main(async () => {
  const { options } = parseArgs(process.argv.slice(2))
  if (!options.source) throw new Error('Usage: node --import tsx scripts/cezar-validate-upstream.mjs --source PATH_TO_PINNED_CEZAR [--mock true]')
  const source = resolve(options.source), root = options.root ?? DEFAULT_ROOT
  const pin = json(within(root, 'config/upstream.json')).cezar
  if (git(source, ['rev-parse', 'HEAD']).output !== pin.commit) throw new Error('Cezar source commit differs from config/upstream.json')
  const { loadWorkflows } = await import(pathToFileURL(resolve(source, 'packages/cezar/src/workflows/load.ts')))
  const { createRunInputSchema } = await import(pathToFileURL(resolve(source, 'packages/contract/src/runs.ts')))
  createRunInputSchema.parse({ workflow: 'flow-implement-task', task: 'Contract validation only', worktree: true, autonomous: true, generateFollowups: false })
  const loaded = await loadWorkflows(root)
  if (loaded.issues.length) throw new Error(JSON.stringify(loaded.issues))
  const ours = loaded.workflows.find(w => w.name === 'flow-implement-task')
  if (!ours) throw new Error('FLOW workflow not loaded')
  const report = { checkedAt: new Date().toISOString(), cezarCommit: pin.commit, cezarVersion: pin.packageVersion, schema: 'pass', createRunApiContract: 'pass', workflow: ours.name, mock: 'not_run', realCodingAgent: 'not_run', githubCli: 'not_run', openMercatoRuntime: 'out_of_scope' }
  if (options.mock === 'true') {
    const temp = mkdtempSync(resolve(tmpdir(), 'flow-cezar-upstream-'))
    const saved = { CEZ_DRY_RUN: process.env.CEZ_DRY_RUN, CEZ_DISPATCH: process.env.CEZ_DISPATCH, CEZ_FOLLOWUPS: process.env.CEZ_FOLLOWUPS }
    let manager, store
    try {
      process.env.CEZ_DRY_RUN = '1'; process.env.CEZ_DISPATCH = '0'; process.env.CEZ_FOLLOWUPS = '0'
      for (const directory of ['.ai/skills', '.ai/cezar/workflows']) cpSync(within(root, directory), resolve(temp, directory), { recursive: true })
      mkdirSync(resolve(temp, 'scripts'), { recursive: true })
      for (const filename of ['cezar-lib.mjs', 'cezar-verify.mjs']) cpSync(resolve(root, 'scripts', filename), resolve(temp, 'scripts', filename))
      writeJson(resolve(temp, '.ai/cezar/config.json'), { baseBranch: 'main', defaultRunner: 'claude', skillsRepos: [], liveTitleUpdates: false })
      writeFileSync(resolve(temp, '.gitignore'), '.local/\n.ai/cezar/runs*\n.ai/cezar/worktrees/\n.ai/cezar/dispatch/\n')
      for (const args of [['init', '-q', '-b', 'main'], ['config', 'user.name', 'Cezar synthetic test'], ['config', 'user.email', 'cezar-test@example.invalid'], ['add', '.'], ['commit', '-qm', 'synthetic test fixture']]) {
        const result = git(temp, args); if (!result.ok) throw new Error(result.error)
      }
      const { RunStore } = await import(pathToFileURL(resolve(source, 'packages/cezar/src/runs/store.ts')))
      const { RunManager } = await import(pathToFileURL(resolve(source, 'packages/cezar/src/workflows/run.ts')))
      store = RunStore.open(resolve(temp, '.ai/cezar')); manager = new RunManager(store, temp)
      const settle = async id => {
        const deadline = Date.now() + 45000
        while (Date.now() < deadline) {
          const record = store.getRun(id)
          if (['done', 'failed', 'cancelled', 'review'].includes(record?.status)) return record
          await new Promise(r => setTimeout(r, 100))
        }
        manager.cancel(id); throw new Error('Mock Cezar run did not settle within 45s')
      }
      const smoke = { name: 'flow-synthetic-smoke', source: 'built-in', steps: [{ id: 'agent', prompt: '{{task}}' }, { id: 'check', command: 'node -e "console.log(\'CEZAR_MOCK_CHECK_PASS\')"' }] }
      const run = manager.startRun(smoke, { task: 'mock:done synthetic infrastructure smoke; no implementation claim', autonomous: true })
      const good = await settle(run.id)
      if (good.status !== 'done' || !good.worktreePath || !good.steps.every(s => s.status === 'done')) throw new Error(`Mock infrastructure failed: ${good.status}`)
      // The actual project workflow must reject a mock that never implemented its task.
      const actual = (await loadWorkflows(temp)).workflows.find(w => w.name === ours.name)
      const badRun = manager.startRun(actual, { task: 'mock:done negative control: no bound task or acceptance evidence', autonomous: true })
      const bad = await settle(badRun.id)
      if (bad.status !== 'failed' || bad.steps.find(s => s.id === 'verify')?.status !== 'failed') throw new Error(`Project accepted fake implementation: ${bad.status}`)
      report.mock = 'pass'; report.mockInfrastructure = { status: good.status, isolatedWorktree: true, steps: good.steps.map(s => ({ id: s.id, status: s.status })) }
      report.negativeControl = { status: bad.status, expected: 'failed', checkRejectedMissingImplementation: true, steps: bad.steps.map(s => ({ id: s.id, status: s.status, iterations: s.iterations })) }
    } finally {
      manager?.dispose(); store?.flush()
      for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value }
      rmSync(temp, { recursive: true, force: true })
    }
  }
  writeJson(resolve(root, 'evidence/cezar-upstream.json'), report)
  console.log(JSON.stringify(report, null, 2))
})
