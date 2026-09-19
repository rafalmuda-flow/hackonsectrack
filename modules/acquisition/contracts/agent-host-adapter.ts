import { z } from 'zod'
import { roleContracts, validateAgentOutput } from './agents'
import { qualifyPoc } from '../lib/domain'

const triState = z.enum(['yes', 'no', 'unknown'])
const hostOfferSchema = z.object({
  id: z.string().min(1), version: z.string().min(1), status: z.enum(['proposal', 'approved']),
  name: z.string().min(1), scope: z.array(z.string().min(1)), exclusions: z.array(z.string().min(1)),
  pricePln: z.number().nonnegative().nullable(), approvedBy: z.string().min(1).nullable(),
}).strict()

/** The host retains version identity; the model receives only approved commercial facts. */
export function mapHostOfferToAgent(rawOffer: unknown) {
  const offer = hostOfferSchema.parse(rawOffer)
  if (offer.status === 'approved' && !offer.approvedBy) throw new Error('Approved host offer requires an approver')
  return {
    hostOfferRef: { id: offer.id, version: offer.version, status: offer.status },
    agentOffer: {
      id: offer.id, approval: offer.status === 'proposal' ? 'draft' as const : 'approved' as const,
      name: offer.name, scope: offer.scope, exclusions: offer.exclusions,
      pricePln: offer.status === 'approved' ? offer.pricePln : null,
      approvedBy: offer.status === 'approved' ? offer.approvedBy : null,
    },
  }
}

const hostFitContextSchema = z.object({
  identity: triState, offerCoversProblem: triState, deliveryFeasible: triState,
  customerBudgetFit: triState, purchaseIntent: triState, providerCostAllowed: z.boolean(),
  repeatableNeed: triState,
}).strict()

/** No extra LLM inference. Unknown operational capability or commercial fact stays unknown. */
export function mapFitToProcessGates(rawInput: unknown, rawOutput: unknown, rawContext: unknown) {
  validateAgentOutput('fit_reviewer', rawInput, rawOutput)
  const input = roleContracts.fit_reviewer.input.parse(rawInput)
  const data = roleContracts.fit_reviewer.output.parse(rawOutput).data
  const context = hostFitContextSchema.parse(rawContext)
  const evidence = new Map(input.evidence.map((source) => [source.id, source]))
  const supportedProblem = input.findings.some((finding) =>
    ['content_defect', 'cadence', 'declared_need'].includes(finding.category) &&
    finding.certainty !== 'unknown' && finding.citations.length > 0 &&
    finding.citations.every((citation) => evidence.get(citation.evidenceId)?.text.includes(citation.quote)),
  )
  const serviceFit = data.decision === 'fit' && supportedProblem && context.offerCoversProblem === 'yes'
    ? 'yes' as const : context.offerCoversProblem === 'no' ? 'no' as const : 'unknown' as const
  const gates = {
    identity: context.identity, supportedProblem, serviceFit,
    deliveryFeasible: context.deliveryFeasible, budgetFit: context.customerBudgetFit,
    purchaseIntent: context.purchaseIntent,
    costAllowed: context.providerCostAllowed && input.estimatedPreparationCostPln <= input.preparationBudgetPln,
    repeatableNeed: context.repeatableNeed,
  }
  // Preserve the agent's stated reason. Never invent the particular failed sub-gate.
  if (data.decision === 'not_fit') return { decision: 'stop' as const, reason: data.summary, gates }
  if (data.decision === 'unknown' || data.status !== 'ready') return { decision: 'hold' as const, reason: data.summary, gates }
  return { ...qualifyPoc(gates), gates }
}

const proofBuildContextSchema = z.object({
  qualityPassed: z.boolean(),
  sourceArtifactHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  offerVersion: z.string().min(1),
}).strict()

/** P11 authoritative assembly. Optional LLM notes never replace these source-owned fields. */
export function buildProofPack(rawInput: unknown, rawContext: unknown) {
  const input = roleContracts.proof_writer.input.parse(rawInput)
  const context = proofBuildContextSchema.parse(rawContext)
  if (input.findings.length < 1 || input.findings.length > 3) throw new Error('Select 1–3 reviewed findings before assembling the proof pack')
  const canBuild = context.qualityPassed && input.candidate.identityVerified && input.comparisonStatus !== 'none_pass'
  const canClaimImprovement = input.comparisonStatus === 'new_wins'
  const commercialReadiness = canBuild && canClaimImprovement && input.offer.approval === 'approved' && !!input.offer.approvedBy
  const result = roleContracts.proof_writer.output.parse({
    kind: 'research',
    data: {
      status: canBuild ? 'ready' : 'needs_input',
      summary: canBuild ? 'Pakiet złożony z zachowaniem sprawdzonych obserwacji i tekstu próbki.' : 'Wewnętrzny raport próby wymagającej poprawy lub weryfikacji.',
      uncertainties: ['Gotowość klienta do zakupu nie została potwierdzona.'],
      reviewReasons: canBuild ? [] : ['Potwierdź tożsamość i uzyskaj pozytywną ocenę jakości przed zatwierdzeniem pakietu.'],
      title: `Próbka komunikacji: ${input.candidate.name}`,
      observations: structuredClone(input.findings),
      samplePost: input.post.text,
      whyBetter: [],
      nextStep: 'Przejrzyj materiał i wybierz dalszy krok wewnętrzny.',
      offerId: input.offer.approval === 'approved' && input.offer.approvedBy ? input.offer.id : null,
      quotedPricePln: commercialReadiness ? input.offer.pricePln : null,
      limitations: [
        'Materiał demonstracyjny nie jest dowodem zainteresowania zakupem ani gwarancją wyniku.',
        ...(input.comparisonStatus !== 'new_wins' ? ['Nie wykazano przewagi nad oryginałem; materiał pozostaje do przeglądu wewnętrznego.'] : []),
        ...(input.offer.approval !== 'approved' ? ['Oferta jest robocza; cena nie jest prezentowana.'] : []),
      ],
      improvementClaimAllowed: canClaimImprovement,
      commercialReadiness,
    },
  })
  validateAgentOutput('proof_writer', input, result)
  return {
    artifactType: canBuild ? 'proof_pack' as const : 'diagnostic_report' as const,
    snapshot: { input: structuredClone(input), sourceArtifactHash: context.sourceArtifactHash, offerVersion: context.offerVersion, qualityPassed: context.qualityPassed },
    result,
  }
}
