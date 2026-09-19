import { createHash } from 'node:crypto'
import { existsSync, readFileSync, realpathSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs'
import { dirname, resolve, relative, isAbsolute, sep } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const ID_RE = /^[A-Za-z][A-Za-z0-9._-]{0,63}$/
export const SHA_RE = /^[a-f0-9]{40}$/
export function die(message) { throw new Error(message) }
export function json(path) { return JSON.parse(readFileSync(path, 'utf8')) }
export function within(root, path, mustExist = true) {
  if (typeof path !== 'string' || !path || isAbsolute(path)) die(`Expected repository-relative path: ${path}`)
  const full = resolve(root, path)
  const rel = relative(resolve(root), full)
  if (rel === '..' || rel.startsWith(`..${sep}`)) die(`Path escapes repository: ${path}`)
  if (mustExist) {
    if (!existsSync(full)) die(`Missing file: ${path}`)
    const realRel = relative(realpathSync(root), realpathSync(full))
    if (realRel === '..' || realRel.startsWith(`..${sep}`)) die(`Symlink escapes repository: ${path}`)
  }
  return full
}
export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}
export function git(root, args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 })
  return { ok: result.status === 0, output: result.stdout?.trim() ?? '', error: result.stderr?.trim() ?? '' }
}
export function manifest(root = DEFAULT_ROOT) {
  const value = json(within(root, 'backlog/backlog.json'))
  const tasks = Array.isArray(value) ? value : value.tasks
  if (!Array.isArray(tasks) || !tasks.length) die('backlog/backlog.json must contain a nonempty tasks array')
  const seen = new Set()
  for (const task of tasks) {
    if (!ID_RE.test(task.id ?? '') || seen.has(task.id)) die(`Invalid or duplicate task id: ${task.id}`)
    seen.add(task.id)
    if (!task.title || !task.owner || !['P0', 'P1'].includes(task.priority)) die(`Incomplete task: ${task.id}`)
    if (!(task.estimateHours > 0 && task.estimateHours <= 2)) die(`Task ${task.id} must take >0 and <=2h`)
    if (!Number.isInteger(task.wave) || task.wave < 0) die(`Invalid wave for ${task.id}`)
    for (const key of ['dependsOn', 'files', 'acceptance']) if (!Array.isArray(task[key])) die(`Missing ${key} for ${task.id}`)
    if (!task.acceptance.length || !task.files.length) die(`Missing acceptance/files for ${task.id}`)
    if (!['todo', 'verified'].includes(task.status)) die(`Invalid status for ${task.id}`)
    within(root, task.taskFile)
    for (const path of task.files) within(root, path, false)
    if (!Array.isArray(task.verification) || !task.verification.length) die(`No task-specific verification for ${task.id}`)
    for (const check of task.verification) {
      if (typeof check.command !== 'string' || !/^[A-Za-z0-9._/-]+$/.test(check.command) || !Array.isArray(check.args) || check.args.some(x => typeof x !== 'string')) die(`Invalid verification command for ${task.id}`)
      if (['sh', 'bash', 'zsh', 'fish', 'cmd', 'powershell'].includes(check.command)) die(`Use command + args, not a shell for ${task.id}`)
      if (['npm', 'pnpm', 'yarn'].includes(check.command) && check.args.join(' ').match(/^(run )?(verify|test)$/)) die(`Generic verification alone cannot accept ${task.id}`)
    }
  }
  const byId = new Map(tasks.map(t => [t.id, t]))
  for (const task of tasks) for (const id of task.dependsOn) if (!byId.has(id) || id === task.id) die(`Invalid dependency ${id} for ${task.id}`)
  const active = new Set(), done = new Set()
  const visit = id => {
    if (active.has(id)) die(`Dependency cycle at ${id}`)
    if (done.has(id)) return
    active.add(id); for (const dep of byId.get(id).dependsOn) visit(dep); active.delete(id); done.add(id)
  }
  for (const task of tasks) visit(task.id)
  return { tasks, byId }
}
export function taskHash(root, task) {
  return taskHashData(task, readFileSync(within(root, task.taskFile)))
}
function taskHashData(task, card) {
  // Status is descriptive preparation history; it must not invalidate accepted code.
  const { status, ...spec } = task
  return createHash('sha256').update(JSON.stringify(spec)).update('\n').update(card).digest('hex')
}
export function completions(root) {
  const path = resolve(root, '.local/completions.json')
  if (!existsSync(path)) return { schemaVersion: 1, accepted: {} }
  const data = json(path)
  if (data.schemaVersion !== 1 || !data.accepted || typeof data.accepted !== 'object' || Array.isArray(data.accepted)) die('Invalid .local/completions.json; see docs/08-CEZAR.md')
  return data
}
export function baseCommit(root) {
  const config = json(within(root, '.ai/cezar/config.json'))
  const base = config.baseBranch
  if (typeof base !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(base)) die('Invalid Cezar baseBranch')
  const result = git(root, ['rev-parse', '--verify', `${base}^{commit}`])
  if (!result.ok) die(`Base branch ${base} unavailable; initialize/checkout committed main first`)
  return { branch: base, commit: result.output }
}
export function acceptedIssue(root, task, record, baseSha) {
  if (!record) return 'not accepted by integrator'
  if (record.taskSpecHash !== taskHash(root, task)) return 'task/card changed since acceptance'
  if (!SHA_RE.test(record.commit ?? '')) return 'accepted commit is not a full SHA'
  if (typeof record.acceptedBy !== 'string' || !record.acceptedBy.trim() || !Number.isFinite(Date.parse(record.acceptedAt))) return 'missing reviewer/date'
  if (!git(root, ['merge-base', '--is-ancestor', record.commit, baseSha]).ok) return 'accepted commit is absent from base branch'
  try {
    const oldManifest = git(root, ['show', `${record.commit}:backlog/backlog.json`])
    if (!oldManifest.ok) return 'task manifest absent from accepted commit'
    const parsed = JSON.parse(oldManifest.output), oldTask = (Array.isArray(parsed) ? parsed : parsed.tasks)?.find(t => t.id === task.id)
    if (!oldTask) return 'task absent from accepted commit'
    const oldCard = spawnSync('git', ['show', `${record.commit}:${oldTask.taskFile}`], { cwd: root, encoding: 'utf8' })
    if (oldCard.status !== 0 || taskHashData(oldTask, oldCard.stdout) !== record.taskSpecHash) return 'task contract differs from accepted commit'
    within(root, record.evidenceFile)
    const existsAtCommit = git(root, ['cat-file', '-e', `${record.commit}:${record.evidenceFile}`])
    if (!existsAtCommit.ok) return 'evidence absent from accepted commit'
  } catch { return 'evidence file missing or unsafe' }
  return null
}
export function state(root = DEFAULT_ROOT) {
  const { tasks, byId } = manifest(root)
  const accepted = completions(root).accepted
  const base = baseCommit(root)
  const reasons = new Map()
  const acceptanceReason = id => {
    if (reasons.has(id)) return reasons.get(id)
    const task = byId.get(id)
    let issue = acceptedIssue(root, task, accepted[id], base.commit)
    if (!issue) {
      const invalidDep = task.dependsOn.find(dep => acceptanceReason(dep))
      if (invalidDep) issue = `dependency ${invalidDep} no longer accepted`
    }
    reasons.set(id, issue); return issue
  }
  const acceptedIds = new Set(tasks.filter(t => !acceptanceReason(t.id)).map(t => t.id))
  const claimsDir = resolve(root, '.local/cezar/claims')
  const activeIds = existsSync(claimsDir) ? readdirSync(claimsDir).filter(n => n.endsWith('.json')).map(n => n.slice(0, -5)) : []
  const overlaps = (a, b) => {
    const left = a.replace(/[?*].*$/, ''), right = b.replace(/[?*].*$/, '')
    return left === right || left.startsWith(right.endsWith('/') ? right : `${right}/`) || right.startsWith(left.endsWith('/') ? left : `${left}/`)
  }
  const rows = tasks.map(task => {
    const blockers = task.dependsOn.filter(id => !acceptedIds.has(id)).map(id => `${id}: ${acceptanceReason(id)}`)
    const ownIssue = accepted[task.id] ? acceptanceReason(task.id) : null
    const claimPath = resolve(root, '.local/cezar/claims', `${task.id}.json`)
    if (existsSync(claimPath)) blockers.push('active or unreviewed launch claim; inspect .local/cezar/claims')
    for (const id of activeIds) {
      const other = byId.get(id)
      if (id !== task.id && other?.files.some(a => task.files.some(b => overlaps(a, b)))) blockers.push(`file ownership overlaps active ${id}`)
    }
    return { id: task.id, title: task.title, owner: task.owner, estimateHours: task.estimateHours, priority: task.priority, wave: task.wave, state: acceptedIds.has(task.id) ? 'accepted' : blockers.length ? 'blocked' : 'ready', blockers, preparationStatus: task.status, ...(ownIssue ? { staleAcceptance: ownIssue } : {}) }
  })
  return { base, rows, tasks, byId }
}
export function parseArgs(argv) {
  const options = {}, positional = []
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith('--')) { positional.push(arg); continue }
    const key = arg.slice(2)
    if (['execute', 'offline', 'json', 'checks-only'].includes(key)) options[key] = true
    else {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) die(`Missing value for ${arg}`)
      options[key] = argv[++i]
    }
  }
  return { options, positional }
}
export function main(fn) { Promise.resolve().then(fn).catch(e => { console.error(`ERROR: ${e.message}`); process.exitCode = 1 }) }
