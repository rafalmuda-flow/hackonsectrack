import { defineSkill } from '@open-mercato/enterprise/modules/agent_orchestrator/lib/sdk/defineSkill'
import { skillSpecs } from './agents/catalog'

// Register once through ES-module import caching. Skills grant no tool or write access.
export const aiSkills = skillSpecs.map((skill) => defineSkill({ ...skill, moduleId: 'acquisition', tools: [] }))
export default aiSkills
