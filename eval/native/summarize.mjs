import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { build } from 'esbuild'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../..')
const bundle = path.join(here, '.cache/gate-bundle.mjs')
await build({ stdin: { contents: `export { validateAgentOutput } from '../../modules/acquisition/contracts/agents';`, resolveDir: here, loader: 'ts' }, outfile: bundle, bundle: true, platform: 'node', format: 'esm', packages: 'external' })
const { validateAgentOutput } = await import(bundle)
const selected = new Map()
const reports = []
for (const name of ['native-v1.json','native-v2.json','native-model-retest.json','native-final-retest.json','native-repair-final.json','native-judge-v2.json','native-judge-final.json','native-judge-repair.json','native-repair-remaining.json','native-judge-remaining.json']) {
  const report = JSON.parse(await fs.readFile(path.join(root, 'evidence', name), 'utf8'))
  reports.push({ file: `evidence/${name}`, total: report.total, reportedPass: report.passed, model: report.model ?? report.judgeModel, estimatedCostUsd: report.estimatedCostUsd, packHash: report.packHash, type: name.includes('judge') ? 'semantic_reviewer' : name.includes('repair-final') ? 'single_semantic_repair' : 'role_execution' })
  if (name !== 'native-v1.json' && !name.includes('judge')) for (const row of report.results) selected.set(row.fixtureId, { file: `evidence/${name}`, model: report.model, row })
}
const adjudication = JSON.parse(await fs.readFile(path.join(root, 'evidence/native-adjudication.json'), 'utf8'))
const rows = [...selected.values()].map(({ file, model, row }) => {
  const role = row.agentId.replace('acquisition.', '')
  let formalPass = true
  const contractErrors = []
  try { validateAgentOutput(role, row.fixtureInput, row.result) } catch (error) { formalPass = false; contractErrors.push(error.message) }
  const review = adjudication.results.find(item => item.sourceRunId === row.run.id)
  const reasons = review?.findings ?? ['No explicit supervising-agent semantic adjudication for this exact run.']
  const semanticDisposition = !formalPass || review?.verdict !== 'accepted_component_sample' ? 'needs_human' : 'accepted_component_sample'
  return { inputHash: createHash('sha256').update(JSON.stringify(row.fixtureInput)).digest('hex'), fixtureId: row.fixtureId, role, sourceReport: file, sourceRunId: row.run.id, model, runtime: row.run.runtime, nativeStatus: row.run.status, formalPass, contractErrors, semanticDisposition, manualReviewFindings: reasons, minorNotes: review?.minorNotes ?? [], nextAction: semanticDisposition === 'needs_human' ? 'Do not advance domain state; operator review or implementation regression task.' : 'Eligible for next internal step in this synthetic component case; no send/publication authorization.' }
})
const roleNames = [...new Set(rows.map(row => row.role))]
const report = {
  createdAt: new Date().toISOString(), status: 'ready_for_implementation_not_release',
  frameworkVersion: '0.8.0', upstreamCommit: 'ab23d45ffc3aeca5e7d994eb57d5526c5b0a4712',
  latestContractBundleHash: createHash('sha256').update(await fs.readFile(bundle)).digest('hex'),
  description: 'Historical live native evaluations plus latest-output revalidation against current contracts. Targeted retries are not a fresh full-suite pass. Semantic adjudication by the supervising coding agent is separate from independent synthetic judge votes and is not claimed to be human certification.',
  canonicalFixtures: rows.length, canonicalFormalPassed: rows.filter(row => row.formalPass).length,
  semanticAcceptedSamples: rows.filter(row => row.semanticDisposition === 'accepted_component_sample').length,
  needsHumanSamples: rows.filter(row => row.semanticDisposition === 'needs_human').length,
  nativeRoleCoverage: roleNames.length, rolesWithAcceptedNormalSample: rows.filter(row => row.fixtureId.endsWith('.normal') && row.semanticDisposition === 'accepted_component_sample').length, rolesWithAcceptedNormalAndChallenging: roleNames.filter(role => rows.filter(row => row.role === role).every(row => row.semanticDisposition === 'accepted_component_sample')).length,
  actualRoleRuns: reports.filter(report => report.type !== 'semantic_reviewer').reduce((n, report) => n + report.total, 0),
  actualReviewerRuns: reports.filter(report => report.type === 'semantic_reviewer').reduce((n, report) => n + report.total, 0),
  estimatedCostUsd: reports.reduce((n, report) => n + report.estimatedCostUsd, 0),
  modelPolicy: { defaultProvider: 'openrouter', defaultModel: 'anthropic/claude-sonnet-5', cheapBaselineModel: 'openai/gpt-4.1-mini', cheapFallbackAllowed: false, productionQualified: false, maximumSemanticRepairs: 1, onRemainingDefect: 'needs_human', note: 'Stronger model is not a substitute for domain validation, semantic review or release approval. Switching model/version requires fresh qualification.' },
  deterministicP11: { report: 'evidence/native-p11-host-gate.json', passedTests: 3, totalTests: 3, nativeCalls: 0, independentOfNativeProofFailure: true }, reports, selectedResults: rows,
  limitations: ['Nine role definitions executed in real unmodified NativeAgentRunner with real provider and SQL persistence; no full application host or cross-step workflow test.', 'PGlite uses PostgreSQL protocol and real MikroORM but does not establish production PostgreSQL concurrency behavior.', 'Seeded agent registry and controlled RBAC scope; no negative auth/tenant tests.', 'Synthetic fixtures only; no real customer search, paid source connectors, publishing, messaging or demand validation.', 'Independent judge was fallible: both false positives and false negatives were observed; exact examples are documented in REPORT.md.', 'One repair demonstration used an evaluation-only native definition with the same role prompt/skills/schema plus a feedback envelope. The host retry adapter remains an implementation task.', 'Latest contract revalidation is offline, not a claim that historical model runs used the final contract hash.', 'Provider cost is a token estimate; billing is authoritative. No production deployment qualification is claimed.'],
}
await fs.writeFile(path.join(root, 'evidence/native-summary.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify({ report: 'evidence/native-summary.json', nativeRoles: roleNames.length, latestFormal: `${report.canonicalFormalPassed}/${rows.length}`, semanticSamples: `${report.semanticAcceptedSamples}/${rows.length}`, needsHuman: report.needsHumanSamples, estimatedCostUsd: report.estimatedCostUsd }))
