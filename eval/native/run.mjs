import 'reflect-metadata'
import fs from 'node:fs/promises'
import { randomUUID, createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { startEvaluationPostgres } from './postgres-harness.mjs'
import { MikroORM } from '@mikro-orm/postgresql'
import { createContainer, asValue } from 'awilix'
import { z } from 'zod'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
process.chdir(path.dirname(fileURLToPath(import.meta.url)))
if (!process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY_FILE) process.env.OPENROUTER_API_KEY = (await fs.readFile(process.env.OPENROUTER_API_KEY_FILE, 'utf8')).trim()
if (!process.env.OPENROUTER_API_KEY) throw new Error('Set OPENROUTER_API_KEY or OPENROUTER_API_KEY_FILE outside the repository')
const reportPath = path.resolve(root, process.env.EVAL_REPORT || 'evidence/native-latest.json')
const fixtureFilter = process.env.EVAL_FIXTURES?.split(',').filter(Boolean) ?? []
await fs.mkdir('.cache', { recursive: true })
await build({ stdin: { contents: `export { aiAgents } from '../../modules/acquisition/ai-agents'; export { agentFixtures } from '../../fixtures/agents/manifest'; export { validateAgentOutput } from '../../contracts/agents';`, resolveDir: process.cwd(), loader: 'ts' }, outfile: '.cache/pack-bundle.mjs', bundle: true, platform: 'node', format: 'esm', packages: 'external' })
const packHash = createHash('sha256').update(await fs.readFile('.cache/pack-bundle.mjs')).digest('hex')
process.env.OM_AI_PROVIDER ||= 'openrouter'
process.env.OM_AI_MODEL ||= 'anthropic/claude-sonnet-5'
process.env.OM_AGENT_RUN_TIMEOUT_MS ||= '120000'
process.env.ENABLE_CRUD_API_CACHE = 'false'
process.env.OM_AGENT_TRACE_CAPTURE = 'on'

const { defineAgent } = await import('@open-mercato/enterprise/modules/agent_orchestrator/lib/sdk/defineAgent')
const { AgentRuntimeService } = await import('@open-mercato/enterprise/modules/agent_orchestrator/lib/runtime/agentRuntime')
const { seedAgentRegistryForTests } = await import('@open-mercato/ai-assistant/modules/ai_assistant/lib/agent-registry')
const { CommandBus } = await import('@open-mercato/shared/lib/commands')
const { setGlobalEventBus } = await import('@open-mercato/shared/modules/events')
const orchestratorEntities = await import('@open-mercato/enterprise/modules/agent_orchestrator/data/entities')
const aiEntities = await import('@open-mercato/ai-assistant/modules/ai_assistant/data/entities')
await import('@open-mercato/enterprise/modules/agent_orchestrator/commands/runs')

let postgres
let orm
try {
  postgres = await startEvaluationPostgres()
  const client = postgres.getPgClient()
  await client.connect()
  const version = await client.query('select version()')
  await client.end()
  orm = await MikroORM.init({
    clientUrl: postgres.connectionString,
    entities: [...Object.values(orchestratorEntities), ...Object.values(aiEntities)].filter(value => typeof value === 'function'),
    allowGlobalContext: true,
    pool: { min: 0, max: 1 },
  })
  await orm.schema.update()
  const events = []
  setGlobalEventBus({ emit: async (name, payload) => { events.push({ name, payload }) } })
  const container = createContainer()
  const commandBus = new CommandBus()
  container.register({
    em: asValue(orm.em.fork()),
    commandBus: asValue(commandBus),
    rbacService: asValue({ loadAcl: async () => ({ features: ['agent_orchestrator.agents.run'], isSuperAdmin: false }) }),
  })
  const runtime = new AgentRuntimeService({ container, commandBus })
  container.register('agentRuntime', asValue(runtime))
  const { aiAgents, agentFixtures, validateAgentOutput } = await import('./.cache/pack-bundle.mjs')
  seedAgentRegistryForTests(aiAgents)
  const scope = { tenantId: randomUUID(), organizationId: randomUUID(), userId: randomUUID(), source: 'eval' }
  const suiteStartedAt = new Date().toISOString()
  const results = []
  const catalogResponse = await fetch('https://openrouter.ai/api/v1/models')
  const catalog = await catalogResponse.json()
  const modelMetadata = catalog.data?.find(item => item.id === process.env.OM_AI_MODEL)
  if (!modelMetadata?.pricing?.prompt || !modelMetadata?.pricing?.completion) throw new Error('Cannot resolve provider price for budget cap')
  const promptPrice = Number(modelMetadata.pricing.prompt)
  const completionPrice = Number(modelMetadata.pricing.completion)
  let estimatedCostUsd = 0
  for (const fixture of agentFixtures.filter(item => !fixtureFilter.length || fixtureFilter.includes(item.id))) {
    if (estimatedCostUsd > Number(process.env.EVAL_MAX_COST_USD || '1') * 0.8) throw new Error('Stopping before configured evaluation budget')
    let runId
    const startedAt = new Date().toISOString()
    const errors = []
    let result = null
    try {
      result = await runtime.run(fixture.agentId, fixture.input, { ...scope, onRunPersisted: id => { runId = id } })
      validateAgentOutput(fixture.role, fixture.input, result)
      if (result.data.status !== fixture.expected.status) errors.push(`status expected ${fixture.expected.status}, got ${result.data.status}`)
      if (fixture.id === 'signal_auditor.challenging' && result.data.need !== 'unknown') errors.push('Missing data must yield unknown need')
      if (fixture.id === 'quality_judge.challenging' && result.data.preferredVariantId !== null) errors.push('Unsupported claims cannot win')
      if (fixture.role === 'handoff_writer' && result.data.sendAuthorized !== false) errors.push('Sending cannot be authorized by model')
      if (fixture.id === 'post_writer.challenging' && result.data.post !== null) errors.push('Required evidence absent: no final post')
      if (fixture.id === 'proof_writer.challenging' && result.data.quotedPricePln !== null) errors.push('Draft offer must not expose quoted price')
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
    const stored = runId ? await orm.em.fork().findOne(orchestratorEntities.AgentRun, { id: runId }) : null
    const guards = runId ? await orm.em.fork().count(orchestratorEntities.AgentGuardrailCheck, { agentRunId: runId }) : 0
    const spans = runId ? await orm.em.fork().count(orchestratorEntities.AgentSpan, { agentRunId: runId }) : 0
    const cost = (stored?.inputTokens ?? 0) * promptPrice + (stored?.outputTokens ?? 0) * completionPrice
    estimatedCostUsd += cost
    const row = { inputHash: createHash('sha256').update(JSON.stringify(fixture.input)).digest('hex'), fixtureInput: fixture.input, fixtureId: fixture.id, agentId: fixture.agentId, startedAt, finishedAt: new Date().toISOString(), passed: errors.length === 0, errors, result, run: { id: runId, status: stored?.status, runtime: stored?.runtime, resultKind: stored?.resultKind, inputTokens: stored?.inputTokens, outputTokens: stored?.outputTokens }, guardrailRows: guards, traceSpans: spans, estimatedCostUsd: cost }
    results.push(row)
    await fs.writeFile(reportPath, JSON.stringify({ packHash, suiteStartedAt, finishedAt: new Date().toISOString(), frameworkVersion: '0.8.0', database: 'PGlite PostgreSQL18.3 through PostgreSQL protocol; real MikroORM7 and upstream CommandBus', model: process.env.OM_AI_MODEL, priceSource: 'https://openrouter.ai/api/v1/models', promptPricePerTokenUsd: promptPrice, completionPricePerTokenUsd: completionPrice, estimatedCostUsd, total: results.length, passed: results.filter(r=>r.passed).length, results, limitations: ['Developer harness uses official seeded registry test hook, no generated host registry.', 'RBAC fixture scope; no HTTP/session or negative tenant authorization test.', 'Events collected in harness; no durable event worker.', 'No UI and no workflow transitions.', 'Synthetic data only; KMS fallback noop, encryption not verified.', 'Native runtime persists before custom cross-field postcheck; app wrapper must not commit domain output before postcheck.', 'Provider catalogue pricing estimate excludes unreported retry overhead; provider billing is authoritative.'] }, null, 2))
    console.log(JSON.stringify({ fixtureId: fixture.id, passed: row.passed, errors, runId, inputTokens: stored?.inputTokens, outputTokens: stored?.outputTokens, cumulativeCostUsd: estimatedCostUsd }))
  }
  if (results.some(row => !row.passed)) process.exitCode = 1

} catch (error) {
  console.error(JSON.stringify({ error: (error instanceof Error ? error.message : String(error)).replaceAll(process.env.OPENROUTER_API_KEY, '[REDACTED]') }))
  process.exitCode = 1
} finally {
  if (orm) await orm.close(true)
  if (postgres) await postgres.stop().catch(() => {})
}
