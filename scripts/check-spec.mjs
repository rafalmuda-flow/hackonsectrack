import { readFileSync, readdirSync, existsSync, statSync, writeFileSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const backlog = JSON.parse(readFileSync(join(root, 'backlog/backlog.json'), 'utf8'))
const errors = []
const assert = (condition, message) => { if (!condition) errors.push(message) }
const tasks = backlog.tasks
const byId = new Map(tasks.map(task => [task.id, task]))
assert(byId.size === tasks.length, 'Duplicate task IDs')
const stories = readFileSync(join(root, 'docs/03-USER-STORIES.md'), 'utf8')
const processText = readFileSync(join(root, 'docs/01-PROCESS.md'), 'utf8')
const seen = new Set(), active = new Set(), finish = new Map()
function visit(id) {
  if (seen.has(id)) return finish.get(id)
  if (active.has(id)) { errors.push(`Dependency cycle at ${id}`); return 0 }
  const task = byId.get(id)
  if (!task) { errors.push(`Missing dependency ${id}`); return 0 }
  active.add(id)
  const elapsed = Math.max(0, ...task.dependsOn.map(visit)) + task.estimateHours
  active.delete(id); seen.add(id); finish.set(id, elapsed)
  return elapsed
}
for (const task of tasks) {
  assert(/^T\d{2}$/.test(task.id), `Invalid task ID ${task.id}`)
  assert(['P0', 'P1'].includes(task.priority), `Invalid priority ${task.id}`)
  assert(task.estimateHours > 0 && task.estimateHours <= 2, `Task exceeds two-hour timebox ${task.id}`)
  assert(existsSync(join(root, task.taskFile)), `Missing card ${task.taskFile}`)
  assert(task.files.length && task.acceptance.length && task.verification.length, `Incomplete card ${task.id}`)
  for (const id of task.storyIds) assert(new RegExp(`(?:^### ${id}\\.|^\\| ${id} \\|)`, 'm').test(stories), `Unknown story ${id} in ${task.id}`)
  for (const id of task.processIds) assert(processText.includes(id), `Unknown process ${id} in ${task.id}`)
  for (const id of task.dependsOn) assert(task.priority !== 'P0' || byId.get(id)?.priority === 'P0', `P0 depends on P1: ${task.id} → ${id}`)
  visit(task.id)
}
const p0 = tasks.filter(task => task.priority === 'P0')
const effort = p0.reduce((sum, task) => sum + task.estimateHours, 0)
assert(effort + backlog.reserveHours <= backlog.capacityHours, 'P0 plus reserve exceeds capacity')
const required = ['README.md','AGENTS.md', ...['01-PROCESS','02-SKILL-MAP','03-USER-STORIES','04-ARCHITECTURE','05-AGENTS','06-UI-AND-OPERATIONS','07-BACKLOG','08-CEZAR','09-VALIDATION','10-ENVIRONMENT','11-SOURCES-AND-DECISIONS'].map(x => `docs/${x}.md`)]
for (const path of required) assert(existsSync(join(root,path)), `Missing document ${path}`)
const paths = ['README.md','AGENTS.md', ...['docs','tasks'].flatMap(dir => readdirSync(join(root,dir)).filter(x => x.endsWith('.md')).map(x=>`${dir}/${x}`))]
let checkedLinks = 0
for (const path of paths) {
  const text = readFileSync(join(root,path),'utf8').replace(/```[\s\S]*?```/g, '')
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const href = match[1].split('#')[0]
    if (!href || /^(https?:|mailto:|sandbox:)/.test(href)) continue
    checkedLinks++
    assert(existsSync(resolve(root,dirname(path),href)), `Broken link ${path} → ${href}`)
  }
}
const futureAcceptanceFiles = tasks.filter(task => !existsSync(join(root,`tests/acceptance/${task.id}.test.ts`))).map(x=>x.id)
const report = { status: errors.length ? 'fail' : 'pass', checks: {taskCount:tasks.length,p0:p0.length,p1:tasks.length-p0.length,p0EffortHours:effort,reserveHours:backlog.reserveHours,capacityHours:backlog.capacityHours,unconstrainedDependencyCriticalPathHours:Math.max(...p0.map(t=>finish.get(t.id))),relativeLinks:checkedLinks}, futureAcceptanceFiles, limitations:['Checks document structure and backlog consistency; does not accept future feature implementation.','Dependency critical path ignores developer contention; see scheduled allocation in docs/07-BACKLOG.md.'], errors }
if (process.argv.includes('--report')) writeFileSync(join(root,'evidence/spec-check.json'), JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify(report,null,2))
process.exitCode = errors.length ? 1 : 0
