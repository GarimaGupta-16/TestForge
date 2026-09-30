import { z } from 'zod'

export const TestCaseStepSchema = z.object({
  stepNumber: z.number(),
  action: z.string().describe('Concrete user action or API request, e.g. "Navigate to /create"'),
  target: z.string().optional().describe('Target UI selector, route, or endpoint'),
  expected: z.string().optional().describe('Expected immediate outcome of step'),
})

export const TestCaseSchema = z.object({
  scenarioId: z.string().describe('ID of parent TestPlan scenario, e.g. SCENARIO-001'),
  generationKey: z.string().describe('Deterministic idempotency key, e.g. SCENARIO-001::E2E'),
  title: z.string().describe('Descriptive test case title'),
  objective: z.string().describe('Detailed objective of test case'),
  category: z.enum(['e2e', 'api', 'realtime', 'functional', 'navigation', 'auth']),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  targetSurface: z.string().describe('Route path or component/server file path'),
  steps: z.array(TestCaseStepSchema).min(1, 'Test case must contain at least one step'),
  expectedResults: z.string().describe('Overall expected result of test execution'),
  sourceEvidence: z.array(z.string()).min(1, 'Source evidence files required'),
  groundingStatus: z.enum(['verified', 'needs_review']).default('verified'),
  automationCandidate: z.boolean().default(true),
})

export const TestCaseSuiteSchema = z.object({
  repositoryFullName: z.string(),
  testCases: z.array(TestCaseSchema).min(1, 'At least one test case is required'),
})

export type TestCaseStep = z.infer<typeof TestCaseStepSchema>
export type TestCase = z.infer<typeof TestCaseSchema>
export type TestCaseSuite = z.infer<typeof TestCaseSuiteSchema>
