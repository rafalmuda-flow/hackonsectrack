import { resolve } from 'node:path'
import { rmSync } from 'node:fs'
import { DEFAULT_ROOT, parseArgs, manifest, taskHash, git, json, completions, baseCommit, acceptedIssue, writeJson, within, SHA_RE, main } from './cezar-lib.mjs'
main(() => {
  const { options, positional } = parseArgs(process.argv.slice(2))
  const root = options.root ?? DEFAULT_ROOT, id = positional[0]
  if (!id || !options.commit || !options.reviewer) throw new Error('Usage: node scripts/cezar-accept.mjs TASK_ID --commit FULL_SHA --reviewer NAME')
  const task = manifest(root).byId.get(id)
  if (!task || !SHA_RE.test(options.commit)) throw new Error('Unknown task or invalid full commit SHA')
  const evidenceFile = options.evidence ?? `evidence/tasks/${id}.md`
  within(root, evidenceFile)
  const record = { taskSpecHash: taskHash(root, task), commit: options.commit, acceptedBy: options.reviewer, acceptedAt: new Date().toISOString(), evidenceFile }
  const problem = acceptedIssue(root, task, record, baseCommit(root).commit)
  if (problem) throw new Error(problem)
  const content = git(root, ['show', `${record.commit}:${evidenceFile}`])
  if (!content.ok || content.output.trim().length < 30) throw new Error('Accepted commit must contain a substantive task evidence report')
  const data = completions(root)
  data.accepted[id] = record
  writeJson(resolve(root, '.local/completions.json'), data)
  rmSync(resolve(root, `.local/cezar/claims/${id}.json`), { force: true })
  console.log(`Accepted ${id} @ ${record.commit.slice(0, 12)} by ${record.acceptedBy}; no Git merge performed.`)
})
