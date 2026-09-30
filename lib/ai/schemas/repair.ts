import { z } from 'zod'

export const RepairProposalSchema = z.object({
  failureId: z.string().min(1, 'Failure ID is required'),
  repairType: z.enum(['test_locator', 'test_assertion', 'test_definition_assertion']),
  target: z.object({
    kind: z.literal('test_case_step'),
    testCaseId: z.string().min(1, 'Test case ID is required'),
    stepIndex: z.number().int().nonnegative('Step index must be a non-negative integer'),
  }),
  originalValue: z.string().min(1, 'Original value is required'),
  proposedValue: z.string().min(1, 'Proposed value is required'),
  diffContent: z.string().min(1, 'Logical diff content is required'),
  explanation: z.string().min(10, 'Explanation must be at least 10 characters'),
  verificationPlan: z.array(z.string().min(5)).min(1, 'At least one verification step is required'),
  revisionOf: z.string().nullable().optional(),
})

export type RepairProposal = z.infer<typeof RepairProposalSchema>
