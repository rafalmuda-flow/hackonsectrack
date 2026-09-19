import test from 'node:test'
import assert from 'node:assert/strict'
import { assessCadence, candidateKey, canonicalPublicUrl, canReserve, hashContent, qualifyPoc, quoteSupported, validateHandoff, validateReview } from '../modules/acquisition/lib/domain.js'
const scope = { tenantId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', organizationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }
const snapshot = { capturedAt: '2026-09-19T10:00:00Z', completeness: 'complete' as const, sourceMode: 'fixture' as const, newestFeedVerified: true, posts: [1,8,15,22,29,36].map((day,i) => ({ id:`p${i}`,url:`https://example.com/p${i}`,text:'Post',pinned:i===5,publishedAt:new Date(Date.UTC(2026,6,day,10)).toISOString() })) }
test('cadence uses historical dates, sorting and excludes pinned order as evidence',()=>{
 const v = assessCadence(snapshot,'2026-09-19T10:00:00Z'); assert.equal(v.signal,'yes'); assert.equal(v.baselineDays,7); assert.equal(v.evidencePostIds[0],'p5')
})
test('empty/partial/stale results abstain instead of declaring stopped marketing',()=>{
 assert.equal(assessCadence({...snapshot,posts:[]},snapshot.capturedAt).signal,'unknown')
 assert.equal(assessCadence({...snapshot,completeness:'partial'},snapshot.capturedAt).reason,'incomplete_timeline')
 assert.equal(assessCadence(snapshot,'2026-10-19T10:00:00Z').reason,'stale_or_future_capture')
})
test('regular low cadence and future timestamps do not become abandonment',()=>{
 const posts=[0,1,2,3,4,5].map(i=>({...snapshot.posts[i],publishedAt:new Date(Date.UTC(2026,8-i,1,10)).toISOString()}))
 assert.equal(assessCadence({...snapshot,posts},snapshot.capturedAt).signal,'unknown')
 assert.equal(assessCadence({...snapshot,posts:[...posts,{...posts[0],id:'future',publishedAt:'2027-01-01T00:00:00Z'}]},snapshot.capturedAt).reason,'future_post')
})
test('public URL guard rejects local, IP, credentials and normalizes identity within tenant',()=>{
 for(const url of ['http://localhost:3000','http://127.0.0.1','http://2130706433','http://[::1]','file:///etc/passwd','https://user:pass@example.com','http://foo.local']) assert.throws(()=>canonicalPublicUrl(url))
 assert.equal(candidateKey(scope,'c','https://www.example.com/a'),candidateKey(scope,'c','http://example.com/b'))
 assert.notEqual(candidateKey(scope,'c','https://example.com'),candidateKey({...scope,organizationId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'},'c','https://example.com'))
})
test('unknown purchase intent stays unknown but does not veto a valid PoC',()=>{
 const fit={identity:'yes' as const,supportedProblem:true,serviceFit:'yes' as const,deliveryFeasible:'yes' as const,budgetFit:'unknown' as const,purchaseIntent:'unknown' as const,costAllowed:true}
 assert.equal(qualifyPoc(fit).decision,'prepare_poc'); assert.equal(qualifyPoc({...fit,identity:'unknown'}).decision,'hold'); assert.equal(qualifyPoc({...fit,supportedProblem:false}).decision,'stop')
})
test('evidence quotation must exist in source, not just carry a source id',()=>{
 assert.equal(quoteSupported('Prowadzimy warsztaty dla zespołów','Prowadzimy\n warsztaty dla zespołów od 2020 roku.'),true)
 assert.equal(quoteSupported('Zwiększamy sprzedaż o 50%','Prowadzimy warsztaty dla zespołów.'),false)
})
test('review binds scope, revision, quality and content hash',()=>{
 const a={id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',scope,candidateId:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',revision:2,hash:hashContent('post'),stale:false,qualityStatus:'passed'}
 const r={artifactId:a.id,artifactHash:a.hash,expectedRevision:2,action:'approve'}
 assert.equal(validateReview(a,r,scope,true).action,'approve')
 assert.throws(()=>validateReview(a,{...r,artifactHash:hashContent('new')},scope,true),/Refresh/)
 assert.throws(()=>validateReview({...a,qualityStatus:'rejected'},r,scope,true),/quality/)
 assert.throws(()=>validateReview(a,r,{...scope,organizationId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'},true),/not found/)
 assert.throws(()=>validateReview(a,r,scope,false),/permission/)
})
test('export and commercial handoff do not imply an approved offer or a connected recipient',()=>{
 const h={schemaVersion:'acquisition.handoff.v1',requestId:'11111111-1111-4111-8111-111111111111',candidateId:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',scope,target:'export',artifactId:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',artifactHash:hashContent('post'),offer:{id:'start',version:'1',status:'proposal'},commercialReadiness:false,requestedNextStep:'internal_review',evidenceIds:['s1'],packageSummary:'Internal sample'}
 const ready={...h,comparisonStatus:'tie'}
 assert.equal(validateHandoff(ready,scope,h.artifactHash,false).target,'export')
 assert.throws(()=>validateHandoff({...ready,commercialReadiness:true},scope,h.artifactHash,false))
 assert.throws(()=>validateHandoff({...ready,target:'agency'},scope,h.artifactHash,false),/not configured/)
 assert.throws(()=>validateHandoff({...ready,commercialReadiness:true,offer:{...h.offer,status:'approved'}},scope,h.artifactHash,false),/improvement/)
})
test('budget includes outstanding reservations and rejects invalid values',()=>{
 assert.equal(canReserve(1,.7,.2,.1),true); assert.equal(canReserve(1,.7,.2,.11),false); assert.throws(()=>canReserve(1,NaN,0,.1)); assert.throws(()=>canReserve(1,0,0,-1))
})

test('cadence abstains when the newest post cannot be verified or baseline falls outside the window',()=>{
 assert.equal(assessCadence({...snapshot,newestFeedVerified:false},snapshot.capturedAt).reason,'latest_post_unverified')
 assert.equal(assessCadence(snapshot,snapshot.capturedAt,{baselineWindowDays:14}).reason,'insufficient_baseline')
})
test('review requires reasons for non-approval and a specific revision entry point',()=>{
 const a={id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',scope,candidateId:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',revision:2,hash:hashContent('post'),stale:false,qualityStatus:'passed'}
 const base={artifactId:a.id,artifactHash:a.hash,expectedRevision:2}
 for(const action of ['revise','discard','hold']) assert.throws(()=>validateReview(a,{...base,action},scope,true))
 assert.throws(()=>validateReview(a,{...base,action:'revise',reason:'Fix unsupported fact'},scope,true))
 assert.equal(validateReview(a,{...base,action:'revise',reason:'Fix unsupported fact',reviseFrom:'P09'},scope,true).reviseFrom,'P09')
 assert.equal(validateReview(a,{...base,action:'hold',reason:'Waiting for context'},scope,true).reason,'Waiting for context')
})
