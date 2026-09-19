import test from 'node:test'
import assert from 'node:assert/strict'
import { roles, roleContracts, validateAgentOutput, releaseEligible, inspectAgentInput } from '../contracts/agents'
import { agentFixtures, fixtureById } from '../fixtures/agents/manifest'
import { agentSpecs, skillSpecs, portableAgentDefinition } from '../agents/catalog'
import { mapHostOfferToAgent, mapFitToProcessGates, buildProofPack } from '../contracts/agent-host-adapter'

for (const fixture of agentFixtures) test(`synthetic contract: ${fixture.id}`, () => {
  roleContracts[fixture.role].input.parse(fixture.input)
  const result = validateAgentOutput(fixture.role, fixture.input, fixture.referenceOutput)
  assert.equal(result.data.status, fixture.expected.status)
})

test('complete role coverage with normal and challenging evidence', () => {
  assert.equal(agentSpecs.length, 9)
  assert.equal(new Set(agentSpecs.map((spec) => spec.role)).size, 9)
  for (const role of roles) {
    assert.equal(agentFixtures.filter((fixture) => fixture.role === role).length, 2)
    const definition = portableAgentDefinition(role)
    assert.equal(definition.id, `acquisition.${role}`)
    assert.ok(definition.systemPrompt.length > 1000)
    for (const skill of definition.skills) assert.ok(skillSpecs.some((item) => item.id === `acquisition.${skill}`))
  }
})

test('model cannot forge tenant or workflow scope in strict output', () => {
  const f = fixtureById('signal_auditor.normal')
  f.referenceOutput.data.tenantId = 'another-tenant'
  assert.throws(() => validateAgentOutput(f.role, f.input, f.referenceOutput))
})

test('fabricated citation and invented quote both fail', () => {
  for (const mutate of [
    (f: any) => { f.referenceOutput.data.findings[0].citations[0].evidenceId = 'invented' },
    (f: any) => { f.referenceOutput.data.findings[0].citations[0].quote = 'Firma traci 90% klientów.' },
  ]) {
    const f = fixtureById('signal_auditor.normal')
    mutate(f)
    assert.throws(() => validateAgentOutput(f.role, f.input, f.referenceOutput), /Unknown evidence|Quote not found/)
  }
})

test('failed collection cannot be interpreted as a dormant profile', () => {
  const f = fixtureById('signal_auditor.challenging')
  f.referenceOutput.data.status = 'ready'
  f.referenceOutput.data.need = 'consistency'
  assert.throws(() => validateAgentOutput(f.role, f.input, f.referenceOutput), /Failed collection/)
})

test('partial timeline cannot substantiate observed inactivity', () => {
  const f = fixtureById('signal_auditor.normal')
  f.input.collection.completeness = 'partial'
  f.referenceOutput.data.findings[0].category = 'cadence'
  assert.throws(() => validateAgentOutput(f.role, f.input, f.referenceOutput), /Incomplete collection/)
})

test('observed need cannot omit its evidence', () => {
  const f = fixtureById('audience_researcher.normal')
  f.referenceOutput.data.questions[0].citations = []
  assert.throws(() => validateAgentOutput(f.role, f.input, f.referenceOutput), /requires evidence/)
})

test('unapproved offer and exceeded preparation budget independently block fit', () => {
  for (const mutate of [
    (f: any) => { f.input.offer.approval = 'draft' },
    (f: any) => { f.input.estimatedPreparationCostPln = 31 },
  ]) {
    const f = fixtureById('fit_reviewer.normal')
    mutate(f)
    assert.throws(() => validateAgentOutput(f.role, f.input, f.referenceOutput), /approved offer|exceeds budget/)
  }
})

test('identity ambiguity requires a human instead of ready brief', () => {
  const f = fixtureById('brief_writer.normal')
  f.input.candidate.identityVerified = false
  assert.throws(() => validateAgentOutput(f.role, f.input, f.referenceOutput), /Unverified identity/)
})

test('post constraints enforce max length and claim linkage', () => {
  const f = fixtureById('post_writer.normal')
  f.input.brief.maxCharacters = 100
  assert.throws(() => validateAgentOutput(f.role, f.input, f.referenceOutput), /character limit/)
  f.input.brief.maxCharacters = 800
  f.referenceOutput.data.post.claimReferences[0].excerpt = 'Ta firma ma 20 lat doświadczenia.'
  assert.throws(() => validateAgentOutput(f.role, f.input, f.referenceOutput), /Claim excerpt/)
})

test('same hard quality gate rejects factual invention despite high style scores', () => {
  assert.equal(releaseEligible({ clarity: 4, relevance: 4, specificity: 4, factuality: 3, voice: 4 }, []), false)
  assert.equal(releaseEligible({ clarity: 3, relevance: 3, specificity: 3, factuality: 4, voice: 3 }, []), true)
  assert.equal(releaseEligible({ clarity: 4, relevance: 4, specificity: 4, factuality: 4, voice: 4 }, ['Invented statistic']), false)
  const f = fixtureById('quality_judge.challenging')
  f.referenceOutput.data.preferredVariantId = 'v_x8'
  assert.throws(() => validateAgentOutput(f.role, f.input, f.referenceOutput), /quality gate/)
})

test('judge must assess all blinded variants exactly once with genuine excerpts', () => {
  const f = fixtureById('quality_judge.normal')
  f.referenceOutput.data.evaluations[0].variantId = 'v_m2'
  assert.throws(() => validateAgentOutput(f.role, f.input, f.referenceOutput), /exactly once/)
  const q = fixtureById('quality_judge.normal')
  q.referenceOutput.data.evaluations[0].reasons[0].excerpt = 'This sentence does not occur.'
  assert.throws(() => validateAgentOutput(q.role, q.input, q.referenceOutput), /Critique quote/)
})

test('proof may neither replace approved sample nor invent offer price', () => {
  const f = fixtureById('proof_writer.normal')
  f.referenceOutput.data.samplePost = 'Nowa wersja po akceptacji.'
  assert.throws(() => validateAgentOutput(f.role, f.input, f.referenceOutput), /preserve the reviewed post/)
  const p = fixtureById('proof_writer.normal')
  p.referenceOutput.data.quotedPricePln = 999
  assert.throws(() => validateAgentOutput(p.role, p.input, p.referenceOutput), /Price must match/)
})

test('handoff draft cannot bypass material or contact approval and never authorizes send', () => {
  const f = fixtureById('handoff_writer.normal')
  f.input.contactEligibility = 'not_assessed'
  assert.throws(() => validateAgentOutput(f.role, f.input, f.referenceOutput), /eligibility approval/)
  const s = fixtureById('handoff_writer.normal')
  s.referenceOutput.data.sendAuthorized = true
  assert.throws(() => validateAgentOutput(s.role, s.input, s.referenceOutput))
})

test('fixture origin cannot be presented as live evidence', () => {
  const f = fixtureById('signal_auditor.normal')
  f.input.scope.synthetic = false
  assert.throws(() => validateAgentOutput(f.role, f.input, f.referenceOutput), /Synthetic\/live evidence mismatch/)
})

test('human escalation has an actionable reason', () => {
  const f = fixtureById('handoff_writer.challenging')
  f.referenceOutput.data.reviewReasons = []
  assert.throws(() => validateAgentOutput(f.role, f.input, f.referenceOutput), /actionable review reason/)
})

test('internal demo can prepare a sample against a draft offer without pretending commercial approval', () => {
  const f = fixtureById('fit_reviewer.normal')
  f.input.mode = 'internal_demo'
  f.input.offer.approval = 'draft'
  f.input.offer.approvedBy = null
  f.referenceOutput.data.offerId = null
  f.referenceOutput.data.uncertainties = ['Oferta jest szkicem; próbka służy przeglądowi wewnętrznemu.']
  assert.equal(validateAgentOutput(f.role, f.input, f.referenceOutput).data.status, 'ready')
})

test('tie, original winner or absent original allows internal report but prohibits commercial claims', () => {
  for (const comparisonStatus of ['tie', 'original_wins', 'none_pass', 'not_comparable']) {
    const f = fixtureById('proof_writer.normal')
    f.input.comparisonStatus = comparisonStatus
    assert.throws(() => validateAgentOutput(f.role, f.input, f.referenceOutput), /Improvement claim|No improvement claim/)
    f.referenceOutput.data.improvementClaimAllowed = false
    f.referenceOutput.data.commercialReadiness = false
    f.referenceOutput.data.whyBetter = []
    f.referenceOutput.data.quotedPricePln = null
    assert.equal(validateAgentOutput(f.role, f.input, f.referenceOutput).data.status, 'ready')
  }
})

test('internal handoff can be ready without external-message authorization', () => {
  const f = fixtureById('handoff_writer.challenging')
  f.input.mode = 'internal_demo'
  f.referenceOutput.data.status = 'ready'
  f.referenceOutput.data.nextAction = 'review_draft'
  f.referenceOutput.data.reviewReasons = []
  assert.equal(validateAgentOutput(f.role, f.input, f.referenceOutput).data.status, 'ready')
  f.referenceOutput.data.commercialReadiness = true
  assert.throws(() => validateAgentOutput(f.role, f.input, f.referenceOutput), /Commercial handoff/)
})

test('brief cannot silently switch channel or expand its size', () => {
  const f = fixtureById('brief_writer.normal')
  f.referenceOutput.data.brief.channel = 'linkedin'
  assert.throws(() => validateAgentOutput(f.role, f.input, f.referenceOutput), /approved channel/)
})

test('host preflight catches missing required source before invoking a model', () => {
  const missing = fixtureById('post_writer.challenging')
  assert.equal(inspectAgentInput(missing.role, missing.input).decision, 'needs_input')
  assert.match(inspectAgentInput(missing.role, missing.input).reasons[0], /source e1/)
  const valid = fixtureById('post_writer.normal')
  assert.equal(inspectAgentInput(valid.role, valid.input).decision, 'run')
})

test('handoff cannot bypass approved offer and improvement by setting readiness false', () => {
  for (const mutate of [
    (f: any) => { f.input.offer.approval = 'draft'; f.input.offer.approvedBy = null },
    (f: any) => { f.input.comparisonStatus = 'original_wins' },
    (f: any) => { f.input.comparisonStatus = 'not_comparable' },
  ]) {
    const f = fixtureById('handoff_writer.normal')
    mutate(f)
    f.referenceOutput.data.commercialReadiness = false
    assert.throws(() => validateAgentOutput(f.role, f.input, f.referenceOutput), /External message requires/)
  }
})

test('proof cannot quote even an approved price when the new post did not win', () => {
  const f = fixtureById('proof_writer.normal')
  f.input.comparisonStatus = 'original_wins'
  f.referenceOutput.data.improvementClaimAllowed = false
  f.referenceOutput.data.commercialReadiness = false
  f.referenceOutput.data.whyBetter = []
  assert.throws(() => validateAgentOutput(f.role, f.input, f.referenceOutput), /Price must match/)
})

test('host offer mapping retains pinned version outside model and removes draft price', () => {
  const fixture = fixtureById('fit_reviewer.normal')
  const { approval: _approval, ...offer } = fixture.input.offer
  const mapped = mapHostOfferToAgent({ ...offer, status: 'proposal', version: 'v7' })
  assert.deepEqual(mapped.hostOfferRef, { id: offer.id, version: 'v7', status: 'proposal' })
  assert.equal(mapped.agentOffer.approval, 'draft')
  assert.equal(mapped.agentOffer.pricePln, null)
  assert.equal(mapped.agentOffer.approvedBy, null)
  assert.equal('version' in mapped.agentOffer, false)
})

test('fit decision cannot fabricate operational feasibility or customer budget', () => {
  const f = fixtureById('fit_reviewer.normal')
  const context = { identity: 'yes', offerCoversProblem: 'yes', deliveryFeasible: 'unknown', customerBudgetFit: 'unknown', purchaseIntent: 'unknown', providerCostAllowed: true, repeatableNeed: 'unknown' }
  const held = mapFitToProcessGates(f.input, f.referenceOutput, context)
  assert.equal(held.decision, 'hold')
  assert.equal(held.gates.serviceFit, 'yes')
  assert.equal(held.gates.deliveryFeasible, 'unknown')
  assert.equal(held.gates.budgetFit, 'unknown')
  assert.equal(held.gates.purchaseIntent, 'unknown')
  assert.equal(mapFitToProcessGates(f.input, f.referenceOutput, { ...context, deliveryFeasible: 'yes' }).decision, 'prepare_poc')
  assert.equal(mapFitToProcessGates(f.input, f.referenceOutput, { ...context, deliveryFeasible: 'yes', offerCoversProblem: 'unknown' }).decision, 'hold')
})

const buildContext = { qualityPassed: true, sourceArtifactHash: `sha256:${'a'.repeat(64)}`, offerVersion: 'v7' }
test('P11 host assembly copies reviewed findings and sample exactly and pins the snapshot', () => {
  const f = fixtureById('proof_writer.normal')
  const built = buildProofPack(f.input, buildContext)
  assert.equal(built.artifactType, 'proof_pack')
  assert.deepEqual(built.result.data.observations, f.input.findings)
  assert.equal(built.result.data.samplePost, f.input.post.text)
  assert.deepEqual(built.result.data.whyBetter, [])
  assert.equal(built.result.data.quotedPricePln, f.input.offer.pricePln)
  assert.equal(built.snapshot.offerVersion, 'v7')
  f.input.findings[0].statement = 'Changed after construction'
  f.input.post.text = 'Changed after construction'
  assert.notEqual(built.result.data.observations[0].statement, f.input.findings[0].statement)
  assert.notEqual(built.snapshot.input.post.text, f.input.post.text)
})

test('P11 host assembly suppresses price for draft offer, tie, old winner and no original', () => {
  for (const comparisonStatus of ['tie', 'original_wins', 'not_comparable']) {
    const f = fixtureById('proof_writer.normal')
    f.input.comparisonStatus = comparisonStatus
    const built = buildProofPack(f.input, buildContext)
    assert.equal(built.result.data.quotedPricePln, null)
    assert.equal(built.result.data.commercialReadiness, false)
    assert.deepEqual(built.result.data.whyBetter, [])
  }
  const draft = fixtureById('proof_writer.challenging')
  assert.equal(buildProofPack(draft.input, buildContext).result.data.quotedPricePln, null)
})

test('P11 failed quality yields a diagnostic report, not an approvable proof pack', () => {
  const f = fixtureById('proof_writer.normal')
  f.input.comparisonStatus = 'none_pass'
  const built = buildProofPack(f.input, { ...buildContext, qualityPassed: false })
  assert.equal(built.artifactType, 'diagnostic_report')
  assert.equal(built.result.data.status, 'needs_input')
  assert.equal(built.result.data.commercialReadiness, false)
  assert.equal(built.result.data.quotedPricePln, null)
})
