import './ai-skills'
import { defineAgent } from '@open-mercato/enterprise/modules/agent_orchestrator/lib/sdk/defineAgent'
import { agentSpecs, portableAgentDefinition } from './agents/catalog'
import { agentFixtures } from './fixtures/manifest'

/** Native OM registration. Inputs/outputs are validated again by the host adapter. */
export const aiAgents = agentSpecs.map((spec) => {
  const portable = portableAgentDefinition(spec.role)
  return defineAgent({
    id: portable.id,
    moduleId: 'acquisition',
    label: spec.label,
    description: `${spec.step}: ${spec.description}`,
    agentType: 'researcher',
    instructions: spec.instructions,
    skills: spec.skills.map((id) => `acquisition.${id}`),
    tools: [],
    allowedActions: [],
    loop: { maxSteps: 1 },
    result: { kind: 'research', schema: portable.schema },
    sampleInput: agentFixtures.find((fixture) => fixture.role === spec.role && fixture.scenario === 'normal')!.input,
  })
})
export default aiAgents
