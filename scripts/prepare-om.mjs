import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { resolve, dirname, relative, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const get = key => { const i = args.indexOf(key); return i < 0 ? null : args[i + 1] }
const config = JSON.parse(readFileSync(join(root, 'config/upstream.json'), 'utf8')).openMercato
const target = resolve(get('--target') || join(root, '.runtime/open-mercato'))
const source = get('--source') || config.repository
function run(command, argv, cwd = root) {
  const r = spawnSync(command, argv, { cwd, stdio: 'inherit' })
  if (r.error || r.status !== 0) throw new Error(`${command} failed (${r.status ?? r.error.message})`)
}
function hash(path) { return createHash('sha256').update(readFileSync(path)).digest('hex') }
function files(path) { return readdirSync(path, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(join(path,e.name)) : [join(path,e.name)]) }
if (target === root || root.startsWith(target + '/')) throw new Error('Choose a separate runtime directory')
mkdirSync(dirname(target), { recursive: true })
if (!existsSync(join(target, '.git'))) {
  if (existsSync(target) && readdirSync(target).length) throw new Error('Target is nonempty and is not a Git checkout')
  run('git', ['clone', '--no-checkout', source, target])
  run('git', ['checkout', '--detach', config.commit], target)
}
const rev = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: target, encoding: 'utf8' })
if (rev.stdout.trim() !== config.commit) throw new Error('Existing host uses a different pin; refusing to reset it')
const manifestPath = join(target, '.acquisition-overlay.json')
const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null
if (previous) for (const [path, digest] of Object.entries(previous.files)) {
  if (!existsSync(join(target, path)) || hash(join(target,path)) !== digest) throw new Error(`Local change in managed overlay: ${path}; preserve it before refreshing`)
}
const moduleDir = join(target, config.modulePath)
if (existsSync(moduleDir) && !previous) throw new Error('Existing acquisition module is not managed by this installer')
mkdirSync(moduleDir, { recursive: true })
cpSync(join(root,'modules/acquisition'), moduleDir, { recursive: true })
const moduleList = join(target,'apps/mercato/src/modules.ts')
let text = readFileSync(moduleList,'utf8')
const marker = 'export const enabledModules: ModuleEntry[] = ['
if (!text.includes("id: 'acquisition'")) {
  if (!text.includes(marker)) throw new Error('Pinned host module registry shape differs; manual inspection required')
  text = text.replace(marker, marker + "\n  { id: 'acquisition', from: '@app' },")
  writeFileSync(moduleList,text)
}
const managedFiles = Object.fromEntries([...files(moduleDir), moduleList].map(p => [relative(target,p),hash(p)]))
writeFileSync(manifestPath, JSON.stringify({ sourceCommit:config.commit, files:managedFiles },null,2)+'\n')
writeFileSync(join(target,'.env.acquisition.example'), 'OM_ENABLE_ENTERPRISE_MODULES=true\nOM_ENABLE_ENTERPRISE_MODULES_AGENTS=true\nOM_AI_PROVIDER=openrouter\nOM_AI_MODEL=\nOPENROUTER_API_KEY=\nQUEUE_STRATEGY=local\n')
console.log(`Overlay prepared: ${target}`)
console.log('Next: configure .env using host .env.example plus .env.acquisition.example; then run pinned starter doctor/up. Preparation is not a passing runtime test.')
