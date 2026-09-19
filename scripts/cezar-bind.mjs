import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { DEFAULT_ROOT, parseArgs, manifest, taskHash, git, json, writeJson, main } from './cezar-lib.mjs'
main(() => {
  const { options, positional } = parseArgs(process.argv.slice(2))
  const root = options.root ?? DEFAULT_ROOT, taskId = positional[0]
  const task = manifest(root).byId.get(taskId)
  if (!task) throw new Error(`Unknown task ${taskId}`)
  const hash = taskHash(root, task)
  if (options['expected-hash'] !== hash) throw new Error('Task hash differs from launch; do not change the task contract')
  const path = resolve(root, '.local/current-task.json')
  if (existsSync(path)) {
    const bound = json(path)
    if (bound.taskId !== taskId || bound.taskSpecHash !== hash) throw new Error('Worktree is bound to a different task/spec')
    console.log(`Already bound to ${taskId}`); return
  }
  const head = git(root, ['rev-parse', 'HEAD']), branch = git(root, ['branch', '--show-current'])
  if (!head.ok || !branch.output.startsWith('cez/')) throw new Error('Bind only inside the Cezar task branch (cez/*)')
  writeJson(path, { taskId, taskSpecHash: hash, baseCommit: head.output, branch: branch.output, boundAt: new Date().toISOString() })
  console.log(`Bound ${taskId} to ${branch.output}`)
})
