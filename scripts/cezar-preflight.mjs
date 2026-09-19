import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { parse } from 'yaml'
import { DEFAULT_ROOT, manifest, json, within, baseCommit, parseArgs, main } from './cezar-lib.mjs'

export function preflight(root, { offline = false } = {}) {
  const errors = [], notes = []
  const check = (name, fn) => { try { fn(); notes.push(`${name}: OK`) } catch (error) { errors.push(`${name}: ${error.message}`) } }
  check('Node24', () => { if (+process.versions.node.split('.')[0] !== 24) throw new Error(`found ${process.version}`) })
  check('Task manifest', () => { manifest(root) })
  check('Pinned Cezar', () => {
    const pin = json(within(root, 'config/upstream.json')).cezar
    if (pin.packageVersion !== '0.11.1' || !/^[a-f0-9]{40}$/.test(pin.commit ?? '')) throw new Error('Expected exact reviewed release + commit')
  })
  check('Workflows + local skills', () => {
    const dir = within(root, '.ai/cezar/workflows')
    const names = new Set()
    for (const file of readdirSync(dir).filter(f => /\.ya?ml$/.test(f))) {
      const doc = parse(readFileSync(resolve(dir, file), 'utf8'))
      if (!doc?.name || !Array.isArray(doc.steps) || !doc.steps.length || doc.skills) throw new Error(`Invalid ${file}`)
      if (names.has(doc.name)) throw new Error(`Duplicate workflow ${doc.name}`)
      names.add(doc.name)
      const prior = new Set()
      for (const key of Object.keys(doc)) if (!['name', 'description', 'steps'].includes(key)) throw new Error(`Unsupported workflow key ${key}`)
      for (const step of doc.steps) {
        for (const key of Object.keys(step)) if (!['id', 'name', 'prompt', 'skill', 'model', 'runner', 'allowedTools', 'bashAllowlist', 'command', 'onFail'].includes(key)) throw new Error(`Unsupported step key ${key}`)
        if (!step.id || prior.has(step.id) || Boolean(step.command) === Boolean(step.prompt ?? step.skill)) throw new Error(`Invalid step ${step.id}`)
        if (step.onFail && (!prior.has(step.onFail.retry) || !Number.isInteger(step.onFail.max) || step.onFail.max < 1)) throw new Error(`Invalid retry ${step.id}`)
        if (step.skill) {
          const skill = readFileSync(within(root, `.ai/skills/${step.skill}/SKILL.md`), 'utf8')
          const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(skill)
          if (!front || parse(front[1]).name !== step.skill) throw new Error(`Skill mismatch ${step.skill}`)
        }
        prior.add(step.id)
      }
    }
    if (!names.has('flow-implement-task')) throw new Error('flow-implement-task workflow missing')
  })
  if (!offline) {
    check('Git base', () => { baseCommit(root) })
    check('Coding CLI', () => {
      const runner = json(within(root, '.ai/cezar/config.json')).defaultRunner ?? 'codex'
      const result = spawnSync(runner, ['--version'], { encoding: 'utf8', timeout: 10000 })
      if (result.status !== 0) throw new Error(`${runner} CLI unavailable; install and sign in on the Cezar host`)
      notes.push('CLI executable exists; Cezar still checks actual provider authentication at run start')
    })
  } else notes.push('OFFLINE: skipped Git-base/CLI-auth/runtime; this is not proof of a live coding run')
  return { ok: !errors.length, errors, notes }
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) main(() => {
  const { options } = parseArgs(process.argv.slice(2))
  const result = preflight(options.root ?? DEFAULT_ROOT, { offline: options.offline })
  console.log(options.json ? JSON.stringify(result, null, 2) : [...result.notes, ...result.errors.map(e => `FAIL: ${e}`)].join('\n'))
  if (!result.ok) process.exitCode = 1
})
