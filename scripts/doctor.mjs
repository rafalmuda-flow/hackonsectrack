import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const items=[]
items.push({check:'Node24',pass:process.versions.node.startsWith('24.'),detail:process.versions.node})
for(const command of ['git','docker']) {
 const r=spawnSync(command,['--version'],{encoding:'utf8'}); items.push({check:command,pass:!r.error&&r.status===0,detail:r.error?'not installed':r.stdout.trim()})
}
const host=resolve(root,'.runtime/open-mercato')
items.push({check:'pinned host prepared',pass:existsSync(resolve(host,'.acquisition-overlay.json')),detail:host})
items.push({check:'provider configured in environment',pass:!!process.env.OPENROUTER_API_KEY,detail:'key presence only; values never logged'})
console.log(JSON.stringify({scope:'full host prerequisites, not provider/native functional test',items},null,2))
if(items.some(i=>!i.pass))process.exitCode=1
