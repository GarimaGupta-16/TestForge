import { z } from 'zod'

export const FailureAnalysisSchema = z.object({
  rootCause: z.string().min(10, 'Root cause explanation must be at least 10 characters'),
  confidenceScore: z.number().min(0).max(1).describe('Confidence score between 0.0 and 1.0'),
  suggestedFix: z.string().min(10, 'Suggested fix description must be at least 10 characters'),
  affectedComponent: z.string().min(1, 'Affected component or file path is required'),
  evidence: z.array(z.string()).min(1, 'At least one source evidence citation is required'),
  analysis: z.string().min(10, 'Detailed analysis summary must be at least 10 characters'),
})

export type FailureAnalysis = z.infer<typeof FailureAnalysisSchema>
