import { mkdirSync, writeFileSync, rmSync, realpathSync } from 'node:fs'
import { resolve } from 'node:path'
import { DEFAULT_ROOT, parseArgs, state, taskHash, json, within, writeJson, main } from './cezar-lib.mjs'
import { preflight } from './cezar-preflight.mjs'

export function launchPlan(root, id) {
  const data = state(root)
  const task = data.byId.get(id), row = data.rows.find(t => t.id === id)
  if (!task) throw new Error(`Unknown task ${id}`)
  if (row.state !== 'ready') throw new Error(`${id} is ${row.state}: ${row.blockers.join('; ')}`)
  const pin = json(within(root, 'config/upstream.json')).cezar.packageVersion
  const hash = taskHash(root, task)
  const prompt = `Wykonaj tylko zadanie ${id} z ${task.taskFile}. Przeczytaj AGENTS.md i wskazane kontrakty. Oczekiwany taskSpecHash: ${hash}. Uruchom node scripts/cezar-bind.mjs ${id} --expected-hash ${hash}. Zachowaj przydzielony przez Cezara branch i worktree. Nie uruchamiaj kolejnych kart, nie scalaj i nie wysyłaj wiadomości. Wytwórz kod, raport evidence/tasks/${id}.md i assertions evidence/tasks/${id}.json. Nie zmieniaj manifestu ani kryteriów odbioru, aby uzyskać zielony wynik.`
  return { taskId: id, taskSpecHash: hash, baseCommit: data.base.commit, cezarVersion: pin, repositoryRoot: resolve(root), transport: 'single_cockpit_api', request: { workflow: 'flow-implement-task', task: prompt, worktree: true, autonomous: true, generateFollowups: false } }
}
export function reserveLaunch(root, id) {
  const dir = resolve(root, '.local/cezar'), lock = resolve(dir, 'launch.lock')
  mkdirSync(dir, { recursive: true })
  try { mkdirSync(lock) } catch { throw new Error('Another launch is reserving tasks; retry after it finishes (inspect a stale launch.lock after a crash)') }
  try {
    // Re-evaluate deps and intersecting file claims atomically on this coordinator clone.
    const plan = launchPlan(root, id)
    const claims = resolve(dir, 'claims'); mkdirSync(claims, { recursive: true })
    writeFileSync(resolve(claims, `${id}.json`), JSON.stringify({ ...plan, startedAt: new Date().toISOString(), pid: process.pid }), { flag: 'wx' })
    return plan
  } finally { rmSync(lock, { recursive: true, force: true }) }
}
export async function submitToCockpit(root, plan, baseUrl, fetchFn = fetch) {
  const url = new URL(baseUrl)
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Use the local coordinator cockpit origin, e.g. http://127.0.0.1:4321')
  const request = async (path, options = {}) => {
    const response = await fetchFn(`${url.origin}${path}`, { ...options, signal: AbortSignal.timeout(15000), redirect: 'error' })
    if (!response.ok) throw new Error(`Cezar ${path}: HTTP ${response.status}; inspect cockpit before retrying a submitted run`)
    return response.json()
  }
  const health = await request('/api/v1/health')
  if (health.version !== plan.cezarVersion) throw new Error(`Cockpit version ${health.version}; expected pinned ${plan.cezarVersion}`)
  if (health.capabilities?.dispatch !== false) throw new Error('Restart the coordinator cockpit with CEZ_DISPATCH=0; this queue owns task selection')
  const registry = await request('/api/v1/projects')
  const target = registry.projects?.find(project => {
    try { return realpathSync(project.root) === realpathSync(root) } catch { return false }
  })
  if (!target || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(target.id) || target.status !== 'ok') throw new Error('This repository is not an available project in the coordinator cockpit')
  const prefix = `/api/v1/p/${target.id}`
  const catalog = await request(`${prefix}/workflows`)
  if (catalog.issues?.length || !catalog.workflows?.some(w => w.name === plan.request.workflow)) throw new Error('Cockpit did not load the expected project workflow cleanly')
  const run = await request(`${prefix}/runs`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(plan.request) })
  if (typeof run.id !== 'string' || !run.id) throw new Error('Unexpected create-run response; inspect cockpit before retrying')
  return { runId: run.id, status: run.status, projectId: target.id, cockpit: url.origin }
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) main(async () => {
  const { options, positional } = parseArgs(process.argv.slice(2))
  const root = options.root ?? DEFAULT_ROOT, id = positional[0]
  if (!id) throw new Error('Usage: npm run cezar:launch -- TASK_ID [--execute]')
  const plan = launchPlan(root, id)
  if (!options.execute) {
    console.log(JSON.stringify({ mode: 'plan_only', ...plan }, null, 2))
    console.log('No agent started. Add --execute to launch this one task.')
    return
  }
  const result = preflight(root)
  if (!result.ok) throw new Error(result.errors.join('\n'))
  const reserved = reserveLaunch(root, id), claim = resolve(root, `.local/cezar/claims/${id}.json`)
  try {
    const run = await submitToCockpit(root, reserved, options.url ?? 'http://127.0.0.1:4321')
    writeJson(claim, { ...reserved, ...run, submittedAt: new Date().toISOString() })
    console.log(JSON.stringify({ submitted: true, taskId: id, ...run, note: 'Submitted to the single cockpit queue; implementation and acceptance are not complete.' }, null, 2))
  } catch (error) {
    // A lost POST response might still have started work. Do not silently release/retry it.
    writeJson(claim, { ...reserved, submissionUncertain: true, error: error.message, checkedAt: new Date().toISOString() })
    throw error
  }
})
