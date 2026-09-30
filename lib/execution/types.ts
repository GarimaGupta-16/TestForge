export type StepActionType = 'navigate' | 'fill' | 'click' | 'assertion' | 'unknown'

export interface NormalizedStep {
  originalText: string
  actionType: StepActionType
  target?: string
  value?: string
  expected?: string
}

export type ExecutionResultStatus = 'passed' | 'failed' | 'skipped'
export type FailureType = 'timeout' | 'assertion_failure' | 'element_not_found'

export interface SingleTestResult {
  testCaseId: string
  title: string
  filePath: string
  status: ExecutionResultStatus
  durationMs: number
  errorMessage?: string
  errorStack?: string
  failureType?: FailureType
  screenshotBuffer?: Buffer
  artifactFileName?: string
}

export interface RunSuiteOptions {
  baseUrl: string
  actionTimeoutMs?: number
  testTimeoutMs?: number
  suiteTimeoutMs?: number
}

export interface SuiteExecutionSummary {
  status: 'passed' | 'failed'
  totalTests: number
  passedTests: number
  failedTests: number
  skippedTests: number
  durationSeconds: number
  results: SingleTestResult[]
}
