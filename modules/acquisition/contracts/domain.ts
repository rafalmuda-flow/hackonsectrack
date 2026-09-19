import { z } from 'zod'

export const scopeSchema = z.object({ tenantId: z.uuid(), organizationId: z.uuid() }).strict()
export const sourceModeSchema = z.enum(['live', 'fixture', 'import'])
export const postSchema = z.object({
  id: z.string().min(1), url: z.url(), publishedAt: z.iso.datetime(), text: z.string(), pinned: z.boolean().default(false),
}).strict()
export const timelineSchema = z.object({
  capturedAt: z.iso.datetime(), completeness: z.enum(['complete', 'partial', 'unknown']),
  sourceMode: sourceModeSchema, newestFeedVerified: z.boolean(), posts: z.array(postSchema).max(100),
}).strict()
export type Timeline = z.infer<typeof timelineSchema>
export type Scope = z.infer<typeof scopeSchema>
export type TriState = 'yes' | 'no' | 'unknown'

export const cadencePolicySchema = z.object({
  minBaselinePosts: z.number().int().min(3).max(50).default(6),
  baselineWindowDays: z.number().positive().default(90),
  minimumGapDays: z.number().positive().default(30),
  baselineMultiplier: z.number().min(1).default(3),
  maxSourceAgeDays: z.number().positive().default(7),
}).strict()

export const artifactSchema = z.object({
  id: z.uuid(), scope: scopeSchema, candidateId: z.uuid(), revision: z.number().int().positive(),
  hash: z.string().regex(/^sha256:[a-f0-9]{64}$/), stale: z.boolean(),
  qualityStatus: z.enum(['pending', 'passed', 'revise', 'rejected']),
}).strict()
export const approvalSchema = z.object({
  artifactId: z.uuid(), artifactHash: z.string(), expectedRevision: z.number().int().positive(),
  action: z.enum(['approve', 'revise', 'discard', 'hold']), reason: z.string().trim().min(1).max(2000).optional(),
  reviseFrom: z.enum(['P07', 'P08', 'P09', 'P11']).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.action !== 'approve' && !value.reason) ctx.addIssue({code:'custom',path:['reason'],message:'A concrete reason is required'});
  if (value.action === 'revise' && !value.reviseFrom) ctx.addIssue({code:'custom',path:['reviseFrom'],message:'Select the earliest affected stage'});
  if (value.action !== 'revise' && value.reviseFrom) ctx.addIssue({code:'custom',path:['reviseFrom'],message:'Stage selection is only allowed for revision'});
})

export const resumeSchema = z.object({
  expectedVersion: z.number().int().positive(), nativeUserTaskId: z.uuid(),
  resolution: z.enum(['identity_resolved','context_added','source_replaced','budget_extended','quality_revised','review_released']),
  resolutionArtifactId: z.uuid(), reason: z.string().trim().min(1).max(2000),
}).strict()

export const handoffSchema = z.object({
  schemaVersion: z.literal('acquisition.handoff.v1'), requestId: z.uuid(), candidateId: z.uuid(),
  scope: scopeSchema, target: z.enum(['export', 'agency']), artifactId: z.uuid(), artifactHash: z.string(),
  offer: z.object({ id: z.string(), version: z.string(), status: z.enum(['proposal', 'approved']) }).strict(),
  commercialReadiness: z.boolean(), requestedNextStep: z.enum(['internal_review', 'sales_conversation']),
  comparisonStatus: z.enum(['new_wins', 'tie', 'original_wins', 'not_comparable']),
  evidenceIds: z.array(z.string()).min(1), packageSummary: z.string().min(1),
}).strict().superRefine((v, ctx) => {
  if ((v.commercialReadiness || v.requestedNextStep === 'sales_conversation') && v.offer.status !== 'approved') {
    ctx.addIssue({ code: 'custom', path: ['offer'], message: 'Approved offer required for commercial handoff' })
  }
  if ((v.commercialReadiness || v.requestedNextStep === 'sales_conversation') && v.comparisonStatus !== 'new_wins') {
    ctx.addIssue({ code: 'custom', path: ['comparisonStatus'], message: 'Commercial improvement packet requires demonstrated improvement' })
  }
})
