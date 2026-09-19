import { z } from 'zod'

// Portable contracts. No Open Mercato or provider import is allowed here.
export const roles = ['search_planner', 'signal_auditor', 'fit_reviewer', 'audience_researcher', 'brief_writer', 'post_writer', 'quality_judge', 'proof_writer', 'handoff_writer'] as const
export type AgentRole = typeof roles[number]
const text = z.string().min(1).max(8000)
const strings = z.array(text).max(30)
export const scopeSchema = z.object({ tenantId: text, organizationId: text, candidateId: text.nullable(), runId: text, synthetic: z.boolean() }).strict()
export const evidenceSchema = z.object({ id: text, url: z.string().url(), sourceType: z.enum(['website', 'post', 'review', 'input', 'approved_offer']), retrievedAt: z.string().datetime(), publishedAt: z.string().datetime().nullable(), text, completeness: z.enum(['complete', 'partial']), synthetic: z.boolean() }).strict()
const citation = z.object({ evidenceId: text.describe('An existing input.evidence[].id. Never an offer, finding or configuration id.'), quote: text.describe('Exact contiguous substring copied from that evidence.text, preserving case and punctuation. No ellipsis, paraphrase, metadata or date added.') }).strict()
export const findingSchema = z.object({ id: text, category: z.enum(['content_defect', 'cadence', 'declared_need', 'business_fact']), statement: text.describe('Narrow observation or explicitly labelled inference. Check every supplied source for counterevidence before asserting information is absent.'), certainty: z.enum(['observed', 'inferred', 'unknown']), citations: z.array(citation).max(8), implication: text.describe('A limited recommendation or explicit hypothesis about usefulness; never claim measured customer behavior, lost sales or damaged reputation without evidence.') }).strict()
export const offerSchema = z.object({ id: text, approval: z.enum(['approved', 'draft']), name: text, scope: strings, exclusions: strings, pricePln: z.number().nonnegative().nullable(), approvedBy: text.nullable() }).strict()
const base = { scope: scopeSchema, evidence: z.array(evidenceSchema).max(80) }
const outcome = { status: z.enum(['ready', 'needs_input', 'rejected']), summary: text, uncertainties: strings, reviewReasons: strings }
const envelope = <T extends z.ZodRawShape>(shape: T) => z.object({ kind: z.literal('research'), data: z.object({ ...outcome, ...shape }).strict() }).strict()
const candidate = z.object({ name: text, websiteUrl: z.string().url(), profileUrl: z.string().url().nullable(), identityVerified: z.boolean() }).strict()
export const briefSchema = z.object({ audience: text, question: text, objective: text, angle: text, voice: strings, requiredFacts: z.array(citation), avoidClaims: strings, channel: z.enum(['linkedin', 'facebook', 'instagram']), maxCharacters: z.number().int().min(100).max(3000), callToAction: text }).strict()
const postSchema = z.object({ text, claimReferences: z.array(z.object({ excerpt: text.describe('Exact contiguous substring of this output post.text, preserving case and punctuation.'), citations: z.array(citation).min(1) }).strict()), assumptions: strings }).strict()
export const rubricDimensions = ['clarity', 'relevance', 'specificity', 'factuality', 'voice'] as const
const score = z.number().int().min(0).max(4)
const scores = z.object({ clarity: score, relevance: score, specificity: score, factuality: score, voice: score }).strict()

export const roleContracts = {
  search_planner: {
    input: z.object({ ...base, campaign: z.object({ industry: text, geography: text, service: text, maxCandidates: z.number().int().min(1).max(50), allowedSources: z.array(z.enum(['web', 'agency_portfolio', 'public_posts', 'public_mentions'])).min(1) }).strict() }).strict(),
    output: envelope({ queries: z.array(z.object({ query: text, source: z.enum(['web', 'agency_portfolio', 'public_posts', 'public_mentions']), purpose: text }).strict()).max(12), inclusionCriteria: strings, exclusionCriteria: strings }),
  },
  signal_auditor: {
    input: z.object({ ...base, candidate, collection: z.object({ completeness: z.enum(['complete', 'partial', 'failed']), postCount: z.number().int().nonnegative() }).strict(), cadence: z.object({ previousMedianGapDays: z.number().nonnegative().nullable(), lastPostAgeDays: z.number().nonnegative().nullable(), seasonalityKnown: z.boolean() }).strict() }).strict(),
    output: envelope({ findings: z.array(findingSchema).max(12), need: z.enum(['content_quality', 'consistency', 'both', 'none', 'unknown']) }),
  },
  fit_reviewer: {
    input: z.object({ ...base, candidate, findings: z.array(findingSchema), mode: z.enum(['internal_demo', 'commercial']), offer: offerSchema, preparationBudgetPln: z.number().nonnegative(), estimatedPreparationCostPln: z.number().nonnegative() }).strict(),
    output: envelope({ decision: z.enum(['fit', 'not_fit', 'unknown']), reasons: z.array(findingSchema).max(8), buyerNeed: text, willingnessToPay: z.literal('unverified'), offerId: text.nullable(), nextAction: z.enum(['prepare_sample', 'human_review', 'archive']) }),
  },
  audience_researcher: {
    input: z.object({ ...base, candidate, service: text }).strict(),
    output: envelope({ audience: text, questions: z.array(z.object({ question: text, certainty: z.enum(['observed', 'hypothesis']), citations: z.array(citation) }).strict()).max(8), vocabulary: strings, researchGaps: strings }),
  },
  brief_writer: {
    input: z.object({ ...base, candidate, audience: text, customerQuestion: text, findings: z.array(findingSchema), brandVoice: strings, channel: z.enum(['linkedin', 'facebook', 'instagram']), maxCharacters: z.number().int().min(100).max(3000) }).strict(),
    output: envelope({ brief: briefSchema.nullable() }),
  },
  post_writer: {
    input: z.object({ ...base, brief: briefSchema }).strict(),
    output: envelope({ post: postSchema.nullable() }),
  },
  quality_judge: {
    input: z.object({ ...base, brief: briefSchema, variants: z.array(z.object({ id: text, text }).strict()).min(1).max(4) }).strict(),
    output: envelope({ evaluations: z.array(z.object({ variantId: text, scores, reasons: z.array(z.object({ criterion: z.enum(rubricDimensions), excerpt: text, explanation: text }).strict()).min(1), criticalIssues: strings }).strict()).min(1).max(4), preferredVariantId: text.nullable() }),
  },
  proof_writer: {
    input: z.object({ ...base, candidate, findings: z.array(findingSchema), post: postSchema, offer: offerSchema, comparisonStatus: z.enum(['new_wins', 'original_wins', 'tie', 'none_pass', 'not_comparable']) }).strict(),
    output: envelope({ title: text, observations: z.array(findingSchema).max(3), samplePost: text, whyBetter: strings, nextStep: text, offerId: text.nullable(), quotedPricePln: z.number().nonnegative().nullable(), limitations: strings, improvementClaimAllowed: z.boolean(), commercialReadiness: z.boolean() }),
  },
  handoff_writer: {
    input: z.object({ ...base, candidate, offer: offerSchema, proofSummary: text, mode: z.enum(['internal_demo', 'commercial']), comparisonStatus: z.enum(['new_wins', 'original_wins', 'tie', 'none_pass', 'not_comparable']), materialApproved: z.boolean(), contactEligibility: z.enum(['approved', 'not_assessed', 'blocked']), approvedContactChannel: z.enum(['email', 'platform_message', 'none']) }).strict(),
    output: envelope({ internalSummary: text, messageDraft: text.nullable(), nextOwner: z.enum(['sales', 'operator']), nextAction: z.enum(['review_draft', 'resolve_eligibility', 'archive']), offerId: text.nullable(), commercialReadiness: z.boolean(), sendAuthorized: z.literal(false) }),
  },
} as const

export function releaseEligible(values: z.infer<typeof scores>, criticalIssues: string[]): boolean {
  return values.factuality === 4 && values.clarity >= 3 && values.relevance >= 3 && values.specificity >= 3 && values.voice >= 3 && criticalIssues.length === 0
}

/** Host preflight, before spending model tokens. Direct adversarial native evals may deliberately bypass it. */
export function inspectAgentInput(role: AgentRole, rawInput: unknown): { decision: 'run' | 'needs_input'; reasons: string[] } {
  const input = roleContracts[role].input.parse(rawInput)
  const reasons: string[] = []
  if ('candidate' in input && !input.candidate.identityVerified) reasons.push('Confirm candidate identity before generating candidate-specific material.')
  if (role === 'signal_auditor') {
    const value = roleContracts.signal_auditor.input.parse(rawInput)
    if (value.collection.completeness === 'failed') reasons.push('Re-fetch public posts or provide an explicit unknown-data record for operator review.')
  }
  if (role === 'post_writer') {
    const value = roleContracts.post_writer.input.parse(rawInput)
    const evidence = new Map(value.evidence.map((item) => [item.id, item]))
    for (const required of value.brief.requiredFacts) {
      const source = evidence.get(required.evidenceId)
      if (!source || !source.text.includes(required.quote)) reasons.push(`Restore verified source ${required.evidenceId} supporting a required brief fact.`)
    }
  }
  return { decision: reasons.length ? 'needs_input' : 'run', reasons }
}

/** Validate shape first, then relationship to the actual input. Call BEFORE DOMAIN persistence. Native AgentRun keeps the raw result as audit evidence. */
export function validateAgentOutput(role: AgentRole, rawInput: unknown, rawOutput: unknown) {
  const input = roleContracts[role].input.parse(rawInput)
  const output = roleContracts[role].output.parse(rawOutput)
  const errors: string[] = []
  const evidence = new Map<string, z.infer<typeof evidenceSchema>>(input.evidence.map((item: z.infer<typeof evidenceSchema>) => [item.id, item]))
  if (evidence.size !== input.evidence.length) errors.push('Duplicate evidence ids in input')
  if (input.evidence.some((item: z.infer<typeof evidenceSchema>) => item.synthetic !== input.scope.synthetic)) errors.push('Synthetic/live evidence mismatch')
  function checkReferences(value: unknown): void {
    if (!value || typeof value !== 'object') return
    const record = value as Record<string, unknown>
    if (record.certainty === 'observed' && Array.isArray(record.citations) && record.citations.length === 0) errors.push('Observed claim requires a source citation')
    if (typeof record.evidenceId === 'string') {
      const source = evidence.get(record.evidenceId)
      if (!source) errors.push(`Unknown evidence id: ${record.evidenceId}`)
      else if (typeof record.quote === 'string' && !source.text.includes(record.quote)) errors.push(`Quote not found in evidence: ${record.evidenceId}`)
    }
    for (const nested of Object.values(value)) if (typeof nested === 'object') {
      if (Array.isArray(nested)) nested.forEach(checkReferences)
      else checkReferences(nested)
    }
  }
  checkReferences(output)
  const data = output.data
  if (data.status === 'needs_input' && !data.reviewReasons.length) errors.push('needs_input requires an actionable review reason')
  if ('candidate' in input && input.candidate && !input.candidate.identityVerified && data.status === 'ready') errors.push('Unverified identity cannot be ready')
  if (role === 'search_planner') {
    const input = roleContracts.search_planner.input.parse(rawInput)
    const data = roleContracts.search_planner.output.parse(rawOutput).data
    if (data.queries.some((q) => !input.campaign.allowedSources.includes(q.source))) errors.push('Search source outside approved campaign policy')
  }
  if (role === 'signal_auditor') {
    const input = roleContracts.signal_auditor.input.parse(rawInput)
    const data = roleContracts.signal_auditor.output.parse(rawOutput).data
    if (input.collection.completeness === 'failed' && (data.status === 'ready' || data.need !== 'unknown')) errors.push('Failed collection is unknown, not a lead signal')
    if (data.findings.some((f) => f.certainty === 'observed' && !f.citations.length)) errors.push('Observed finding requires a source quote')
    if (input.collection.completeness !== 'complete' && data.findings.some((f) => f.category === 'cadence' && f.certainty === 'observed')) errors.push('Incomplete collection cannot establish observed inactivity')
  }
  if (role === 'fit_reviewer') {
    const input = roleContracts.fit_reviewer.input.parse(rawInput)
    const data = roleContracts.fit_reviewer.output.parse(rawOutput).data
    if (data.decision === 'fit' && input.mode === 'commercial' && (input.offer.approval !== 'approved' || !input.offer.approvedBy)) errors.push('Fit requires approved offer')
    if (data.decision === 'fit' && input.estimatedPreparationCostPln > input.preparationBudgetPln) errors.push('Preparation exceeds budget: human review required')
    if (data.nextAction === 'prepare_sample' && (data.decision !== 'fit' || data.status !== 'ready')) errors.push('Sample preparation requires ready fit')
  }
  if (role === 'audience_researcher') {
    const data = roleContracts.audience_researcher.output.parse(rawOutput).data
    if (data.questions.some((q) => q.certainty === 'observed' && !q.citations.length)) errors.push('Observed customer question requires evidence')
  }
  if (role === 'brief_writer') {
    const input = roleContracts.brief_writer.input.parse(rawInput)
    const data = roleContracts.brief_writer.output.parse(rawOutput).data
    if (data.status === 'ready' && !data.brief) errors.push('Ready brief is missing')
    if (data.brief && (data.brief.channel !== input.channel || data.brief.maxCharacters !== input.maxCharacters)) errors.push('Brief cannot change approved channel or character limit')
  }
  if (role === 'post_writer') {
    const input = roleContracts.post_writer.input.parse(rawInput)
    const data = roleContracts.post_writer.output.parse(rawOutput).data
    if (data.status === 'ready' && !data.post) errors.push('Ready post is missing')
    if (data.post && data.post.text.length > input.brief.maxCharacters) errors.push('Post exceeds channel brief character limit')
    if (data.post && data.post.claimReferences.some((claim) => !data.post!.text.includes(claim.excerpt))) errors.push('Claim excerpt not in post')
  }
  if (role === 'quality_judge') {
    const input = roleContracts.quality_judge.input.parse(rawInput)
    const data = roleContracts.quality_judge.output.parse(rawOutput).data
    const ids = input.variants.map((v) => v.id)
    if (new Set(ids).size !== ids.length) errors.push('Variant identifiers must be unique')
    const rated = data.evaluations.map((v) => v.variantId)
    if (new Set(rated).size !== rated.length || rated.length !== ids.length || rated.some((id: string) => !ids.includes(id))) errors.push('Each blinded variant must be evaluated exactly once')
    for (const evaluation of data.evaluations) {
      const variant = input.variants.find((v) => v.id === evaluation.variantId)
      if (variant && evaluation.reasons.some((r) => !variant.text.includes(r.excerpt))) errors.push('Critique quote missing from evaluated variant')
    }
    if (data.preferredVariantId !== null) {
      const winner = data.evaluations.find((v) => v.variantId === data.preferredVariantId)
      if (!winner || !releaseEligible(winner.scores, winner.criticalIssues)) errors.push('Preferred variant does not pass common quality gate')
    }
  }
  if ('offerId' in data && 'offer' in input && data.offerId !== null && data.offerId !== input.offer.id) errors.push('Offer identity mismatch')
  if (role === 'proof_writer') {
    const input = roleContracts.proof_writer.input.parse(rawInput)
    const data = roleContracts.proof_writer.output.parse(rawOutput).data
    if (data.improvementClaimAllowed !== (input.comparisonStatus === 'new_wins')) errors.push('Improvement claim must follow blinded comparison')
    if (input.comparisonStatus !== 'new_wins' && data.whyBetter.length) errors.push('No improvement claim when new text did not win')
    if (data.commercialReadiness && (input.comparisonStatus !== 'new_wins' || input.offer.approval !== 'approved' || !input.offer.approvedBy)) errors.push('Commercial proof requires winning sample and approved offer')
    if (data.samplePost !== input.post.text) errors.push('Proof must preserve the reviewed post exactly')
    if (data.quotedPricePln !== null && (input.comparisonStatus !== 'new_wins' || input.offer.approval !== 'approved' || !input.offer.approvedBy || data.quotedPricePln !== input.offer.pricePln)) errors.push('Price must match approved offer exactly')
  }
  if (role === 'handoff_writer') {
    const input = roleContracts.handoff_writer.input.parse(rawInput)
    const data = roleContracts.handoff_writer.output.parse(rawOutput).data
    if (data.commercialReadiness && (input.mode !== 'commercial' || !input.materialApproved || input.contactEligibility !== 'approved' || input.comparisonStatus !== 'new_wins' || input.offer.approval !== 'approved' || !input.offer.approvedBy)) errors.push('Commercial handoff requirements missing')
    if (data.messageDraft !== null && (input.offer.approval !== 'approved' || !input.offer.approvedBy || input.comparisonStatus !== 'new_wins')) errors.push('External message requires approved offer and demonstrated improvement')
    if (data.messageDraft !== null && input.mode !== 'commercial') errors.push('Internal mode cannot produce an external message draft')
    if (data.messageDraft !== null && (!input.materialApproved || input.contactEligibility !== 'approved' || input.approvedContactChannel === 'none')) errors.push('Contact draft requires material and channel eligibility approval')
  }
  if (errors.length) throw new Error(`Agent contract violation (${role}): ${errors.join('; ')}`)
  return output
}
