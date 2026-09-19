import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { build } from 'esbuild'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../..')
await fs.mkdir(path.join(here, '.cache'), { recursive: true })
const bundle = path.join(here, '.cache/gate-bundle.mjs')
await build({ stdin: { contents: `export { agentFixtures } from '../../modules/acquisition/fixtures/manifest'; export { inspectAgentInput, validateAgentOutput } from '../../modules/acquisition/contracts/agents';`, resolveDir: here, loader: 'ts' }, outfile: bundle, bundle: true, platform: 'node', format: 'esm', packages: 'external' })
const { agentFixtures, inspectAgentInput } = await import(bundle)
const positive = agentFixtures.find(f => f.id === 'post_writer.normal')
const missing = agentFixtures.find(f => f.id === 'post_writer.challenging')
const damaged = structuredClone(positive.input)
damaged.brief.requiredFacts[0].quote = 'Unsupported modified fact absent from source.'
const failedFetch = agentFixtures.find(f => f.id === 'signal_auditor.challenging')
const rows = [
  { fixtureId: positive.id, scenario: 'verified required evidence', input: positive.input, role: positive.role, expectedDecision: 'run' },
  { fixtureId: missing.id, scenario: 'missing source for required fact', input: missing.input, role: missing.role, expectedDecision: 'needs_input' },
  { fixtureId: 'post_writer.changed_quote', scenario: 'existing source id but unsupported required quote', input: damaged, role: positive.role, expectedDecision: 'needs_input' },
  { fixtureId: failedFetch.id, scenario: 'collection failed', input: failedFetch.input, role: failedFetch.role, expectedDecision: 'needs_input' },
].map(({ input, role, ...row }) => ({ ...row, result: inspectAgentInput(role, input) }))
for (const row of rows) {
  assert.equal(row.result.decision, row.expectedDecision)
  if (row.expectedDecision === 'needs_input') assert.ok(row.result.reasons.length > 0)
}
const report = { createdAt: new Date().toISOString(), contractBundleHash: createHash('sha256').update(await fs.readFile(bundle)).digest('hex'), description: 'Deterministic host preflight before native runtime. No model called, no expected answer supplied to a model.', total: rows.length, passed: rows.length, nativeCalls: 0, results: rows, limitations: ['Component gate test only. Host HTTP handler and workflow integration remain implementation tasks.', 'Raw adverse native agent outputs remain in their original evidence reports and are not reclassified by these passes.'] }
await fs.writeFile(path.join(root, 'evidence/native-input-gate.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify({ report: 'evidence/native-input-gate.json', passed: rows.length, total: rows.length, nativeCalls: 0 }))
