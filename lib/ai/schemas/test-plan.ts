import { z } from 'zod'

export const TestPlanScenarioSchema = z.object({
  id: z.string().describe('Unique identifier for scenario, e.g. SCENARIO-001'),
  title: z.string().describe('Short descriptive title of test scenario'),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  category: z.enum([
    'functional',
    'navigation',
    'authentication',
    'realtime',
    'api',
    'validation',
    'smoke',
    'integration',
  ]),
  targetSurface: z.string().describe('Target route or component path, e.g. /create-quiz or Backend/Server.js'),
  objective: z.string().describe('High-level goal of this test scenario'),
  rationale: z.string().describe('Why this scenario is important based on repository structure'),
  prerequisites: z.array(z.string()).default([]),
  sourceEvidence: z.array(z.string()).min(1, 'At least one repository source evidence citation is required'),
  groundingStatus: z.enum(['grounded', 'needs_review']).default('grounded'),
})

export const TestPlanSchema = z.object({
  version: z.string().default('1.0'),
  repositoryFullName: z.string(),
  generatedAt: z.string(),
  scope: z.string().describe('Overall scope summary of test plan'),
  applicationAreas: z.array(z.string()).default([]),
  testStrategy: z.string().describe('Comprehensive testing strategy outline'),
  assumptions: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  scenarios: z.array(TestPlanScenarioSchema).min(1, 'At least one scenario is required'),
})

export type TestPlanScenario = z.infer<typeof TestPlanScenarioSchema>
export type TestPlan = z.infer<typeof TestPlanSchema>
