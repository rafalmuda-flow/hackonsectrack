import { createHash } from 'node:crypto'
import { isIP } from 'node:net'
import { approvalSchema, artifactSchema, cadencePolicySchema, handoffSchema, scopeSchema, timelineSchema, type Scope, type Timeline, type TriState } from '../contracts/domain.js'

const DAY = 86_400_000
export class DomainError extends Error {
  constructor(public code: string, message: string) { super(message); this.name = 'DomainError' }
}
export function assertSameScope(actual: Scope, expected: Scope) {
  scopeSchema.parse(actual); scopeSchema.parse(expected)
  if (actual.tenantId !== expected.tenantId || actual.organizationId !== expected.organizationId) throw new DomainError('NOT_FOUND', 'Object not found in this organization')
}

/** Lexical guard only. A network adapter must additionally validate resolved DNS and each redirect. */
export function canonicalPublicUrl(raw: string): string {
  const url = new URL(raw)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new DomainError('UNSAFE_URL', 'Public HTTP URL required')
  const host = url.hostname.toLowerCase().replace(/\.$/, '')
  if (!host.includes('.') || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || isIP(host) || host.startsWith('[')) throw new DomainError('UNSAFE_URL', 'Public domain name required')
  url.hostname = host
  url.hash = ''
  return url.toString()
}
export function canonicalDomain(raw: string) {
  return new URL(canonicalPublicUrl(raw)).hostname.replace(/^www\./, '')
}
export function candidateKey(scope: Scope, campaignId: string, websiteUrl: string) {
  scopeSchema.parse(scope)
  return `${scope.tenantId}:${scope.organizationId}:${campaignId}:${canonicalDomain(websiteUrl)}`
}

export function assessCadence(input: Timeline, now: string, policyInput: Partial<ReturnType<typeof cadencePolicySchema.parse>> = {}) {
  const timeline = timelineSchema.parse(input), policy = cadencePolicySchema.parse(policyInput)
  const nowMs = Date.parse(now), captured = Date.parse(timeline.capturedAt)
  if (!Number.isFinite(nowMs)) throw new DomainError('INVALID_DATE', 'Reference date required')
  const unknown = (reason: string) => ({ signal: 'unknown' as TriState, reason, gapDays: null as number | null, baselineDays: null as number | null, evidencePostIds: [] as string[] })
  if (captured > nowMs || (nowMs - captured) / DAY > policy.maxSourceAgeDays) return unknown('stale_or_future_capture')
  if (!timeline.newestFeedVerified) return unknown('latest_post_unverified')
  if (timeline.completeness !== 'complete') return unknown('incomplete_timeline')
  if (timeline.posts.some(p => Date.parse(p.publishedAt) > captured)) return unknown('future_post')
  const sorted = [...new Map(timeline.posts.map(p => [p.id, p])).values()].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
  const latestMs = sorted.length ? Date.parse(sorted[0].publishedAt) : NaN
  const unique = sorted.filter(post => latestMs - Date.parse(post.publishedAt) <= policy.baselineWindowDays * DAY)
  if (unique.length < policy.minBaselinePosts) return unknown('insufficient_baseline')
  const gaps = unique.slice(1).map((p, i) => (Date.parse(unique[i].publishedAt) - Date.parse(p.publishedAt)) / DAY).filter(g => g > 0).sort((a, b) => a - b)
  if (gaps.length < policy.minBaselinePosts - 1) return unknown('insufficient_distinct_dates')
  const mid = Math.floor(gaps.length / 2)
  const baselineDays = gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2
  // Use capture date, not future calendar progression on an old snapshot.
  const gapDays = (captured - Date.parse(unique[0].publishedAt)) / DAY
  const isSignal = gapDays >= policy.minimumGapDays && gapDays >= baselineDays * policy.baselineMultiplier
  return { signal: (isSignal ? 'yes' : 'no') as TriState, reason: isSignal ? 'cadence_change_requires_context' : 'no_cadence_change', gapDays, baselineDays, evidencePostIds: unique.map(p => p.id) }
}

export function qualifyPoc(input: { identity: TriState; supportedProblem: boolean; serviceFit: TriState; deliveryFeasible: TriState; budgetFit: TriState; purchaseIntent: TriState; costAllowed: boolean }) {
  if (input.identity !== 'yes') return { decision: 'hold', reason: 'identity_unresolved' }
  if (!input.supportedProblem) return { decision: 'stop', reason: 'no_supported_problem' }
  if (input.serviceFit === 'no' || input.deliveryFeasible === 'no') return { decision: 'stop', reason: 'service_not_suitable' }
  if (input.serviceFit === 'unknown' || input.deliveryFeasible === 'unknown') return { decision: 'hold', reason: 'missing_fit_evidence' }
  if (!input.costAllowed) return { decision: 'hold', reason: 'budget_limit' }
  // Unknown budget or purchase intent does not establish fit or intent, but is not a PoC veto.
  return { decision: 'prepare_poc', reason: 'supported_problem_and_service_fit' }
}

export function quoteSupported(quote: string, sourceText: string) {
  const normalize = (s: string) => s.normalize('NFC').replace(/\s+/g, ' ').trim()
  return normalize(quote).length >= 8 && normalize(sourceText).includes(normalize(quote))
}
export function hashContent(content: string) { return `sha256:${createHash('sha256').update(content, 'utf8').digest('hex')}` }

export function validateReview(artifactInput: unknown, approvalInput: unknown, callerScope: Scope, canReview: boolean) {
  const artifact = artifactSchema.parse(artifactInput), approval = approvalSchema.parse(approvalInput)
  assertSameScope(artifact.scope, callerScope)
  if (!canReview) throw new DomainError('FORBIDDEN', 'Review permission required')
  if (approval.artifactId !== artifact.id || approval.artifactHash !== artifact.hash || approval.expectedRevision !== artifact.revision || artifact.stale) throw new DomainError('STALE_ARTIFACT', 'Refresh the artifact before deciding')
  if (approval.action === 'approve' && artifact.qualityStatus !== 'passed') throw new DomainError('QUALITY_GATE', 'Resolve quality review before approval')
  return { action: approval.action, artifactId: artifact.id, artifactHash: artifact.hash, revision: artifact.revision, reason: approval.reason, reviseFrom: approval.reviseFrom }
}

export function validateHandoff(input: unknown, callerScope: Scope, approvedArtifactHash: string, targetAvailable: boolean) {
  const handoff = handoffSchema.parse(input)
  assertSameScope(handoff.scope, callerScope)
  if (handoff.artifactHash !== approvedArtifactHash) throw new DomainError('STALE_APPROVAL', 'Approved content differs')
  if (handoff.target === 'agency' && !targetAvailable) throw new DomainError('TARGET_UNAVAILABLE', 'Agency integration is not configured')
  return handoff
}

/** Pure reservation rule; DB implementation must apply it atomically under a campaign row lock. */
export function canReserve(limitUsd: number, spentUsd: number, reservedUsd: number, nextUsd: number) {
  if (![limitUsd, spentUsd, reservedUsd, nextUsd].every(n => Number.isFinite(n) && n >= 0)) throw new DomainError('INVALID_BUDGET', 'Non-negative finite amounts required')
  return Math.round((spentUsd + reservedUsd + nextUsd) * 10000) <= Math.round(limitUsd * 10000)
}
