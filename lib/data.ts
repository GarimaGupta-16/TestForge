export type Status =
  | 'Passed'
  | 'Failed'
  | 'Analyzing'
  | 'Queued'
  | 'Running'
  | 'Repaired'
  | 'Skipped'

export const repositories = [
  {
    name: 'QuizLit',
    slug: 'GarimaGupta-16/Quizlit',
    stack: ['Next.js', 'TypeScript', 'MongoDB'],
    tests: 42,
    passRate: 91,
    state: 'Analyzing',
    routes: 14,
    lastAnalyzed: '2m ago',
  },
  {
    name: 'Finboard',
    slug: 'GarimaGupta-16/finboard',
    stack: ['React', 'TypeScript', 'PostgreSQL'],
    tests: 28,
    passRate: 88,
    state: 'Analyzing',
    routes: 9,
    lastAnalyzed: '18m ago',
  },
  {
    name: 'testpilot-web',
    slug: 'GarimaGupta-16/testpilot-web',
    stack: ['Next.js', 'JavaScript', 'MongoDB'],
    tests: 58,
    passRate: 96,
    state: 'Analyzing',
    routes: 21,
    lastAnalyzed: '41m ago',
  },
] as const

export const pipeline = [
  { label: 'Repository', value: 'Connected', icon: 'repo' },
  { label: 'Intelligence', value: 'Mapped', icon: 'sparkles' },
  { label: 'Test plan', value: 'Ready', icon: 'checklist' },
  { label: 'Playwright', value: '32 generated', icon: 'code' },
  { label: 'Browser', value: 'Live session', icon: 'pen' },
  { label: 'Analysis', value: 'Repairing', icon: 'shield' },
] as const

export const stats = [
  {
    label: 'Repositories',
    value: '3',
    delta: '+1 this month',
    trend: 'up' as const,
    icon: 'repo' as const,
    tone: 'violet' as const,
    spark: [3, 4, 4, 5, 6, 6, 7, 8, 9, 10, 11, 12],
  },
  {
    label: 'Tests generated',
    value: '128',
    delta: '+18.2%',
    trend: 'up' as const,
    icon: 'checklist' as const,
    tone: 'violet' as const,
    spark: [2, 3, 3, 4, 5, 5, 7, 8, 8, 10, 11, 12],
  },
  {
    label: 'Tests passed',
    value: '109',
    delta: '+12.4%',
    trend: 'up' as const,
    icon: 'shield' as const,
    tone: 'green' as const,
    spark: [4, 4, 5, 5, 6, 7, 7, 8, 9, 10, 11, 12],
  },
  {
    label: 'Tests failed',
    value: '19',
    delta: '-4.8%',
    trend: 'down' as const,
    icon: 'alert' as const,
    tone: 'amber' as const,
    spark: [9, 8, 10, 7, 8, 6, 7, 5, 6, 4, 5, 3],
  },
]

export const agentActivity = [
  {
    title: 'Repository analyzed',
    detail: 'testpilot-web · 14 routes discovered',
    time: '2m ago',
    kind: 'success' as const,
  },
  {
    title: 'Test scenarios generated',
    detail: '32 workflows across 6 features',
    time: '4m ago',
    kind: 'success' as const,
  },
  {
    title: 'Running AUTH-004',
    detail: 'Browserbase session active',
    time: 'now',
    kind: 'running' as const,
  },
  {
    title: 'AUTH-004 failed',
    detail: 'Expected dashboard URL · timeout',
    time: 'just now',
    kind: 'error' as const,
  },
  {
    title: 'AI analyzing failure',
    detail: 'Inspecting network events and DOM',
    time: 'just now',
    kind: 'ai' as const,
  },
]

export const recentRuns = [
  {
    id: '#RUN-1024',
    repository: 'QuizLit',
    tests: 24,
    passed: 21,
    failed: 3,
    duration: '2m 14s',
    status: 'Failed' as Status,
    trigger: 'Push · main',
    started: 'Today, 18:42',
  },
  {
    id: '#RUN-1023',
    repository: 'QuizLit',
    tests: 32,
    passed: 32,
    failed: 0,
    duration: '3m 08s',
    status: 'Passed' as Status,
    trigger: 'Scheduled',
    started: 'Today, 16:10',
  },
  {
    id: '#RUN-1022',
    repository: 'Finboard',
    tests: 18,
    passed: 16,
    failed: 2,
    duration: '1m 42s',
    status: 'Analyzing' as Status,
    trigger: 'Pull request #218',
    started: 'Today, 14:55',
  },
  {
    id: '#RUN-1021',
    repository: 'QuizLit',
    tests: 24,
    passed: 23,
    failed: 1,
    duration: '2m 01s',
    status: 'Passed' as Status,
    trigger: 'Manual · Garima',
    started: 'Today, 11:26',
  },
  {
    id: '#RUN-1020',
    repository: 'testpilot-web',
    tests: 58,
    passed: 56,
    failed: 2,
    duration: '4m 37s',
    status: 'Passed' as Status,
    trigger: 'Push · main',
    started: 'Yesterday, 22:04',
  },
  {
    id: '#RUN-1019',
    repository: 'Finboard',
    tests: 18,
    passed: 14,
    failed: 4,
    duration: '1m 58s',
    status: 'Repaired' as Status,
    trigger: 'Scheduled',
    started: 'Yesterday, 19:31',
  },
]

export const testCases = [
  {
    id: 'AUTH-001',
    test: 'Successful login',
    feature: 'Authentication',
    priority: 'HIGH' as const,
    type: 'E2E',
    status: 'Passed' as Status,
    lastRun: 'Today',
  },
  {
    id: 'AUTH-002',
    test: 'Invalid password',
    feature: 'Authentication',
    priority: 'HIGH' as const,
    type: 'E2E',
    status: 'Failed' as Status,
    lastRun: 'Today',
  },
  {
    id: 'AUTH-003',
    test: 'Empty email validation',
    feature: 'Forms',
    priority: 'MEDIUM' as const,
    type: 'E2E',
    status: 'Passed' as Status,
    lastRun: 'Today',
  },
  {
    id: 'NAV-001',
    test: 'Primary navigation',
    feature: 'Navigation',
    priority: 'MEDIUM' as const,
    type: 'E2E',
    status: 'Passed' as Status,
    lastRun: 'Today',
  },
  {
    id: 'QUIZ-001',
    test: 'Create a new quiz',
    feature: 'Quiz creation',
    priority: 'HIGH' as const,
    type: 'E2E',
    status: 'Passed' as Status,
    lastRun: 'Today',
  },
  {
    id: 'QUIZ-002',
    test: 'Leaderboard loads scores',
    feature: 'Regression',
    priority: 'LOW' as const,
    type: 'E2E',
    status: 'Queued' as Status,
    lastRun: 'Today',
  },
  {
    id: 'AUTH-004',
    test: 'Session persists on reload',
    feature: 'Authentication',
    priority: 'HIGH' as const,
    type: 'E2E',
    status: 'Running' as Status,
    lastRun: 'now',
  },
  {
    id: 'NAV-002',
    test: 'Deep link restores state',
    feature: 'Navigation',
    priority: 'LOW' as const,
    type: 'E2E',
    status: 'Passed' as Status,
    lastRun: 'Yesterday',
  },
  {
    id: 'FORM-001',
    test: 'Profile update saves',
    feature: 'Forms',
    priority: 'MEDIUM' as const,
    type: 'E2E',
    status: 'Passed' as Status,
    lastRun: 'Yesterday',
  },
  {
    id: 'REG-001',
    test: 'Pricing table renders tiers',
    feature: 'Regression',
    priority: 'LOW' as const,
    type: 'Visual',
    status: 'Skipped' as Status,
    lastRun: '2 days ago',
  },
]

export const caseFilters = [
  'All',
  'Authentication',
  'Navigation',
  'Forms',
  'Regression',
] as const

export const failures = [
  {
    id: 'AUTH-004',
    test: 'Session persists on reload',
    repository: 'QuizLit',
    cause: 'Timeout waiting for dashboard URL',
    category: 'Flaky selector',
    confidence: 92,
    occurrences: 4,
    suggestion:
      'Wait for the `[data-testid="dashboard-shell"]` element instead of a URL assertion — the redirect resolves after hydration.',
    state: 'Fix proposed' as const,
  },
  {
    id: 'AUTH-002',
    test: 'Invalid password',
    repository: 'QuizLit',
    cause: 'Error copy changed from "Wrong password" to "Incorrect password"',
    category: 'Assertion drift',
    confidence: 97,
    occurrences: 2,
    suggestion:
      'Update the expected text and switch to a role-based locator so future copy edits do not break the assertion.',
    state: 'Auto-repaired' as const,
  },
  {
    id: 'FIN-006',
    test: 'Portfolio chart loads',
    repository: 'Finboard',
    cause: 'API returned 503 during the run window',
    category: 'Environment',
    confidence: 74,
    occurrences: 1,
    suggestion:
      'Retry with backoff and mock the `/api/quotes` response so chart rendering is tested independently of the upstream feed.',
    state: 'Needs review' as const,
  },
]

export const insights = [
  {
    label: 'Pass rate',
    value: '85.2%',
    delta: '+8.4% vs last week',
    trend: 'up' as const,
  },
  {
    label: 'Mean duration',
    value: '2m 26s',
    delta: '-11s vs last week',
    trend: 'up' as const,
  },
  {
    label: 'Flake rate',
    value: '4.1%',
    delta: '-1.3% vs last week',
    trend: 'up' as const,
  },
  {
    label: 'Auto-repairs',
    value: '17',
    delta: '+6 vs last week',
    trend: 'up' as const,
  },
]

export const passRateSeries = [
  { day: 'Mon', pass: 71, fail: 29 },
  { day: 'Tue', pass: 74, fail: 26 },
  { day: 'Wed', pass: 69, fail: 31 },
  { day: 'Thu', pass: 78, fail: 22 },
  { day: 'Fri', pass: 82, fail: 18 },
  { day: 'Sat', pass: 88, fail: 12 },
  { day: 'Sun', pass: 85, fail: 15 },
]

export const featureHealth = [
  { feature: 'Authentication', total: 38, passed: 30, flaky: 5 },
  { feature: 'Navigation', total: 24, passed: 23, flaky: 1 },
  { feature: 'Forms', total: 31, passed: 27, flaky: 2 },
  { feature: 'Quiz creation', total: 19, passed: 18, flaky: 1 },
  { feature: 'Regression', total: 16, passed: 11, flaky: 4 },
]

export const reports = [
  {
    title: 'Weekly quality digest',
    period: 'Aug 19 – Aug 26',
    coverage: 82,
    runs: 41,
    regressions: 3,
    status: 'Ready' as const,
  },
  {
    title: 'Release candidate 4.2',
    period: 'Aug 22 – Aug 25',
    coverage: 91,
    runs: 12,
    regressions: 1,
    status: 'Ready' as const,
  },
  {
    title: 'Finboard regression sweep',
    period: 'Aug 24 – Aug 26',
    coverage: 68,
    runs: 9,
    regressions: 5,
    status: 'Generating' as const,
  },
]

export const agentTimeline = [
  {
    step: 'Understand',
    detail: 'Crawls the repository, maps routes, components and data flows.',
    status: 'done' as const,
    meta: '14 routes · 61 components',
  },
  {
    step: 'Plan',
    detail: 'Derives user-critical journeys and ranks them by blast radius.',
    status: 'done' as const,
    meta: '32 scenarios · 6 features',
  },
  {
    step: 'Generate',
    detail: 'Writes typed Playwright specs with resilient locators.',
    status: 'done' as const,
    meta: '128 specs authored',
  },
  {
    step: 'Execute',
    detail: 'Runs suites in a live Browserbase session with tracing on.',
    status: 'active' as const,
    meta: 'AUTH-004 in flight',
  },
  {
    step: 'Repair',
    detail: 'Diagnoses failures and opens a pull request with the fix.',
    status: 'pending' as const,
    meta: '3 fixes queued',
  },
]

export const agentTranscript = [
  { role: 'agent' as const, text: 'Analyzed testpilot-web. Discovered 14 routes and 61 components.' },
  { role: 'agent' as const, text: 'Generated 32 scenarios. Prioritising authentication and checkout.' },
  { role: 'user' as const, text: 'Focus on the login regression from RUN-1024.' },
  {
    role: 'agent' as const,
    text: 'Reproduced AUTH-004 three times. The dashboard redirect resolves after hydration, so the URL assertion races the navigation.',
  },
  {
    role: 'agent' as const,
    text: 'Proposed fix: wait for the dashboard shell test id. Opening PR #221 against main.',
  },
]
