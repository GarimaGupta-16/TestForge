import 'server-only'
import type { RepositoryAnalysisResult } from '@/lib/github/analysis'
import { getAIProvider } from './factory'
import { TestPlanSchema, type TestPlan } from './schemas/test-plan'
import { TestCaseSuiteSchema, type TestCaseSuite, type TestCase } from './schemas/test-case'
import { RepairProposalSchema, type RepairProposal } from './schemas/repair'
import { FailureAnalysisSchema, type FailureAnalysis } from './schemas/failure-analysis'
import type { AICompletionResponse } from './types'

export interface TestPlanGenerationOptions {
  repositoryFullName: string
  analysis: RepositoryAnalysisResult
  sourceFilesMap?: Map<string, string>
}

export interface TestPlanGenerationResult {
  testPlan: TestPlan
  meta: {
    provider: string
    model: string
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
    repairAttempted: boolean
  }
}

/**
 * Generates a grounded, structured TestPlan for a repository using AI.
 * Enforces strict grounding, source evidence requirements, Zod schema validation,
 * and a 1-attempt server-side repair loop for malformed JSON.
 */
export async function generateTestPlan(
  options: TestPlanGenerationOptions
): Promise<TestPlanGenerationResult> {
  const provider = getAIProvider()
  const { repositoryFullName, analysis, sourceFilesMap } = options

  // 1. Build bounded context summary
  const routesSummary = analysis.routes.map((r) => `- ${r.path} (${r.type} route, ${r.framework || 'detected'})`).join('\n')
  const evidenceSummary = analysis.evidence?.inspectedFiles?.map((f) => `- ${f}`).join('\n') || 'None'

  let sourceFilesContext = ''
  if (sourceFilesMap && sourceFilesMap.size > 0) {
    const snippets: string[] = []
    for (const [path, content] of sourceFilesMap.entries()) {
      const truncatedContent = content.length > 2500 ? `${content.slice(0, 2500)}\n... [truncated]` : content
      snippets.push(`=== FILE: ${path} ===\n${truncatedContent}`)
    }
    sourceFilesContext = snippets.join('\n\n')
  }

  const systemPrompt = `You are TestForge AI, an expert autonomous testing strategist.
Your task is to generate a comprehensive, highly grounded, explainable TestPlan for the repository "${repositoryFullName}".

STRICT GROUNDING & SAFETY RULES:
1. ONLY generate test scenarios that are explicitly supported by the provided repository analysis and source file evidence.
2. DO NOT invent fake routes, non-existent API endpoints, or unevidenced authentication flows.
3. Every scenario MUST include a "sourceEvidence" array citing specific routes or files (e.g. ["src/App.jsx:<Route path='/create-quiz'>", "src/pages/CreateQuiz.jsx", "Backend/Server.js"]).
4. Every targetSurface MUST match an actual route path or verified file path from the context.
5. Provide realistic, high-value test scenarios covering functional user flows, navigation, realtime/WebSocket events if present, API endpoints, and critical state.
6. Return your output STRICTLY as valid JSON matching the specified schema. Do NOT include markdown code blocks around the JSON output.`

  const userPrompt = `REPOSITORY METADATA & ANALYSIS:
Primary Language: ${analysis.primaryLanguage}
Package Manager: ${analysis.packageManager}
Tech Stack: ${analysis.techStack.join(', ')}
Summary: ${analysis.summary}
Detected Features:
- WebSockets: ${analysis.detectedFeatures.hasWebSockets ? 'Yes (Socket.IO/ws detected)' : 'No'}
- Database: ${analysis.detectedFeatures.hasDatabase ? 'Yes' : 'No'}
- Authentication: ${analysis.detectedFeatures.hasAuthentication ? 'Yes' : 'No'}

VERIFIED ROUTE INVENTORY (${analysis.routes.length} routes):
${routesSummary || 'No routes detected'}

INSPECTED FILES & MANIFESTS:
${evidenceSummary}

SELECTED SOURCE FILE SNIPPETS:
${sourceFilesContext || 'No additional source snippets attached'}

EXPLICIT JSON SCHEMA & CONTRACT INSTRUCTIONS:
Generate a complete structured TestPlan JSON with ALL of the following required fields:
- version: "1.0"
- repositoryFullName: "${repositoryFullName}"
- generatedAt: "${new Date().toISOString()}"
- scope: Concise string summary of testing scope for ${repositoryFullName}
- applicationAreas: Array of strings listing functional areas covered
- testStrategy: Comprehensive string overview of testing strategy
- assumptions: Array of explicit string assumptions based strictly on repository evidence
- risks: Array of key risk area strings
- scenarios: Array of grounded scenario objects

EVERY scenario object MUST contain ALL of the following fields:
- id: string (e.g. "SCENARIO-001")
- title: string (short descriptive title)
- priority: MUST be strictly one of lowercase values: "critical" | "high" | "medium" | "low"
- category: MUST be strictly one of lowercase values: "functional" | "navigation" | "authentication" | "realtime" | "api" | "validation" | "smoke" | "integration"
- targetSurface: string (e.g. "/" or "src/pages/Login.jsx")
- objective: string (high-level goal of this test scenario)
- rationale: string (why this scenario is important)
- prerequisites: Array of strings ["..."]
- sourceEvidence: Array of string file/route citations (at least 1 required)
- groundingStatus: MUST be strictly one of lowercase values: "grounded" | "needs_review"

CRITICAL FORMATTING RULES:
- All enum values ("priority", "category", "groundingStatus") MUST be strictly lowercase as specified above.
- Do NOT substitute "description" for "objective" or "rationale".
- Do NOT substitute "steps" or "expectedResult" for "objective" or "rationale".
- Do NOT omit root fields ("scope", "testStrategy", "applicationAreas", "assumptions", "risks").
- Return ONLY valid JSON.`

  let repairAttempted = false
  let completion: AICompletionResponse

  // Initial completion attempt
  completion = await provider.generateCompletion({
    systemPrompt,
    userPrompt,
    temperature: 0.2,
    maxTokens: 6000,
    responseFormat: 'json',
  })

  let rawJsonText = cleanJsonText(completion.rawText)

  // Validate JSON against Zod schema & grounding constraints
  let parsedPlanResult = parseAndValidateTestPlan(rawJsonText, repositoryFullName, analysis, sourceFilesMap)

  if (!parsedPlanResult.success) {
    repairAttempted = true
    console.warn('[AI Generator] Initial JSON validation failed. Attempting 1-attempt repair loop...', parsedPlanResult.error)

    const repairSystemPrompt = `${systemPrompt}

IMPORTANT REPAIR INSTRUCTION:
Your previous JSON output failed validation with the following error:
${parsedPlanResult.error}

STRICT REPAIR REQUIREMENTS:
- Output the COMPLETE canonical TestPlan JSON object including ALL root-level fields:
  "version", "repositoryFullName", "generatedAt", "scope", "applicationAreas", "testStrategy", "assumptions", "risks", "scenarios".
- DO NOT return only the "scenarios" array. DO NOT abbreviate or truncate the JSON.
- Every scenario MUST include "id", "title", "priority", "category", "targetSurface", "objective", "rationale", "prerequisites", "sourceEvidence", "groundingStatus".
- "priority" MUST be strictly one of lowercase: "critical" | "high" | "medium" | "low".
- "category" MUST be strictly one of lowercase: "functional" | "navigation" | "authentication" | "realtime" | "api" | "validation" | "smoke" | "integration".
- "groundingStatus" MUST be strictly one of lowercase: "grounded" | "needs_review".
- "prerequisites" MUST be an array of strings ["..."].
- Output ONLY valid raw JSON. Do NOT include markdown code blocks or fences.`

    const repairCompletion = await provider.generateCompletion({
      systemPrompt: repairSystemPrompt,
      userPrompt: `Corrected prompt for ${repositoryFullName}. Return ONLY valid JSON.`,
      temperature: 0.1,
      maxTokens: 6000,
      responseFormat: 'json',
    })

    completion = repairCompletion
    rawJsonText = cleanJsonText(repairCompletion.rawText)
    parsedPlanResult = parseAndValidateTestPlan(rawJsonText, repositoryFullName, analysis, sourceFilesMap)

    if (!parsedPlanResult.success) {
      throw new Error(`[AI Generator] Failed to generate valid grounded TestPlan after repair attempt: ${parsedPlanResult.error}`)
    }
  }

  return {
    testPlan: parsedPlanResult.data!,
    meta: {
      provider: completion.provider,
      model: completion.model,
      promptTokens: completion.usage?.promptTokens,
      completionTokens: completion.usage?.completionTokens,
      totalTokens: completion.usage?.totalTokens,
      repairAttempted,
    },
  }
}

/**
 * Strips markdown fenced code blocks (```json ... ```) if model includes them and extracts outer JSON bounds.
 */
function cleanJsonText(text: string): string {
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  }

  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1)
  }

  return cleaned
}

/**
 * Parses JSON string, normalizes formatting aliases safely, validates against TestPlan Zod schema, and performs grounding verification.
 */
function parseAndValidateTestPlan(
  jsonText: string,
  repoFullName: string,
  analysis: RepositoryAnalysisResult,
  sourceFilesMap?: Map<string, string>
): { success: boolean; data?: TestPlan; error?: string } {
  let jsonObj: any
  try {
    jsonObj = JSON.parse(jsonText)
  } catch (err: any) {
    return { success: false, error: `Invalid JSON syntax: ${err?.message || 'JSON parse failed'}` }
  }

  // Ensure repositoryFullName and timestamps are set
  if (!jsonObj.repositoryFullName) jsonObj.repositoryFullName = repoFullName
  if (!jsonObj.generatedAt) jsonObj.generatedAt = new Date().toISOString()
  if (!jsonObj.version) jsonObj.version = '1.0'

  // Safe pre-validation normalization for known formatting aliases
  if (Array.isArray(jsonObj.scenarios)) {
    const validCategories = [
      'functional',
      'navigation',
      'authentication',
      'realtime',
      'api',
      'validation',
      'smoke',
      'integration',
    ]

    for (const s of jsonObj.scenarios) {
      if (typeof s === 'object' && s !== null) {
        // Priority normalization
        if (typeof s.priority === 'string') {
          const lowerPri = s.priority.trim().toLowerCase()
          if (['critical', 'high', 'medium', 'low'].includes(lowerPri)) {
            s.priority = lowerPri
          }
        }

        // Category normalization
        if (typeof s.category === 'string') {
          const catVal = s.category.trim()
          if (/^e2e$/i.test(catVal) || /^ui$/i.test(catVal)) {
            s.category = 'functional'
          } else {
            const lowerCat = catVal.toLowerCase()
            if (validCategories.includes(lowerCat)) {
              s.category = lowerCat
            }
          }
        }

        // Grounding status normalization
        if (typeof s.groundingStatus === 'string') {
          const lowerG = s.groundingStatus.trim().toLowerCase()
          if (lowerG === 'verified' || lowerG === 'grounded') {
            s.groundingStatus = 'grounded'
          } else if (lowerG === 'needs review' || lowerG === 'needs_review') {
            s.groundingStatus = 'needs_review'
          }
        }

        // Prerequisites normalization (string -> string[])
        if (typeof s.prerequisites === 'string') {
          s.prerequisites = s.prerequisites.trim() ? [s.prerequisites.trim()] : []
        }

        // Objective / Rationale fallback ONLY when a clearly equivalent field exists
        if (!s.objective && typeof s.description === 'string' && s.description.trim()) {
          s.objective = s.description.trim()
        }
        if (!s.rationale && typeof s.reason === 'string' && s.reason.trim()) {
          s.rationale = s.reason.trim()
        }
        if (!s.rationale && typeof s.description === 'string' && s.description.trim()) {
          s.rationale = s.description.trim()
        }
      }
    }
  }

  const zodResult = TestPlanSchema.safeParse(jsonObj)
  if (!zodResult.success) {
    const issueMessages = zodResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    return { success: false, error: `Schema validation failed: ${issueMessages}` }
  }

  const plan = zodResult.data

  // Grounding check: verify scenarios cite valid routes or files supplied in context
  const validRoutePaths = new Set(analysis.routes.map((r) => r.path))
  const inspectedFiles = new Set<string>([
    ...(analysis.evidence?.inspectedFiles || []),
    ...(sourceFilesMap ? Array.from(sourceFilesMap.keys()) : []),
  ])

  for (const s of plan.scenarios) {
    if (!s.sourceEvidence || s.sourceEvidence.length === 0) {
      return { success: false, error: `Scenario "${s.id}" is missing required sourceEvidence citation.` }
    }

    // Filter sourceEvidence to only include files actually supplied to AI
    const validEvidenceCitations = s.sourceEvidence.filter((ev) => {
      const cleanFile = ev.split(':')[0].trim()
      return inspectedFiles.has(cleanFile) || Array.from(inspectedFiles).some((f) => ev.includes(f))
    })

    if (validEvidenceCitations.length === 0) {
      s.groundingStatus = 'needs_review'
    }

    // Grounding check: verify targetSurface is a known route or file
    const isKnownRoute = validRoutePaths.has(s.targetSurface)
    const isKnownFile = inspectedFiles.has(s.targetSurface) || s.targetSurface.includes('/')

    if (!isKnownRoute && !isKnownFile) {
      s.groundingStatus = 'needs_review'
    }

    // Check if scenario makes concrete UI claims without component file evidence
    const claimsConcreteUI = /click|type|submit|enter|fill|button|input|form|field|modal/i.test(
      `${s.objective} ${s.rationale}`
    )
    const hasComponentFileEvidence = s.sourceEvidence.some((ev) => {
      const path = ev.split(':')[0].trim()
      return (
        (path.startsWith('src/pages/') || path.startsWith('src/components/') || path.startsWith('pages/')) &&
        inspectedFiles.has(path)
      )
    })

    if (claimsConcreteUI && !hasComponentFileEvidence && s.category === 'functional') {
      // Downgrade to needs_review if concrete UI actions are claimed without component file evidence
      s.groundingStatus = 'needs_review'
    }
  }

  return { success: true, data: plan }
}

export interface TestCaseGenerationOptions {
  repositoryFullName: string
  analysis: RepositoryAnalysisResult
  testPlan: TestPlan
  sourceFilesMap?: Map<string, string>
}

export interface TestCaseGenerationResult {
  suite: TestCaseSuite
  meta: {
    provider: string
    model: string
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
    repairAttempted: boolean
  }
}

/**
 * Generates grounded, concrete executable TestCase objects based on persisted TestPlan scenarios and repository source files.
 */
export async function generateTestCases(
  options: TestCaseGenerationOptions
): Promise<TestCaseGenerationResult> {
  const provider = getAIProvider()
  const { repositoryFullName, analysis, testPlan, sourceFilesMap } = options

  let sourceFilesContext = ''
  if (sourceFilesMap && sourceFilesMap.size > 0) {
    const snippets: string[] = []
    for (const [path, content] of sourceFilesMap.entries()) {
      const truncatedContent = content.length > 2500 ? `${content.slice(0, 2500)}\n... [truncated]` : content
      snippets.push(`=== FILE: ${path} ===\n${truncatedContent}`)
    }
    sourceFilesContext = snippets.join('\n\n')
  }

  const systemPrompt = `You are TestForge AI, an expert autonomous testing engineer.
Your task is to generate grounded, concrete executable TestCase objects for "${repositoryFullName}" based STRICTLY on the persisted TestPlan scenarios and supplied repository source files.

STRICT GROUNDING & SAFETY RULES:
1. ONLY generate test cases that map directly to the scenarios defined in the provided TestPlan.
2. DO NOT invent non-existent UI selectors, unevidenced routes, or fake API endpoints.
3. Every test case MUST specify:
   - "scenarioId": The exact ID of the parent TestPlan scenario (e.g. SCENARIO-001)
   - "generationKey": A stable, unique key combining scenarioId and variant (e.g. "SCENARIO-001::E2E")
   - "title": A clear descriptive title
   - "objective": Detailed test goal
   - "category": 'e2e' | 'api' | 'realtime' | 'functional' | 'navigation' | 'auth'
   - "priority": 'HIGH' | 'MEDIUM' | 'LOW'
   - "targetSurface": Target route path or file path
   - "steps": Array of concrete execution steps [{ stepNumber, action, target, expected }]
   - "expectedResults": Overall expected outcome
   - "sourceEvidence": Array of exact file paths supplied in context backing this test case
   - "groundingStatus": 'verified' or 'needs_review'
   - "automationCandidate": boolean
4. Return output STRICTLY as valid JSON matching TestCaseSuiteSchema:
{
  "repositoryFullName": "${repositoryFullName}",
  "testCases": [ ... ]
}`

  const userPrompt = `PERSISTED TESTPLAN SCENARIOS (${testPlan.scenarios.length} scenarios):
${JSON.stringify(testPlan.scenarios, null, 2)}

VERIFIED ROUTE INVENTORY:
${analysis.routes.map((r) => `- ${r.path} (${r.type} route, ${r.framework || 'detected'})`).join('\n')}

SELECTED SOURCE FILE SNIPPETS:
${sourceFilesContext || 'No additional source snippets attached'}

Generate concrete, step-by-step grounded TestCase objects for each TestPlan scenario where source evidence supports concrete execution. Return ONLY valid JSON.`

  let repairAttempted = false
  let completion = await provider.generateCompletion({
    systemPrompt,
    userPrompt,
    temperature: 0.2,
    maxTokens: 3500,
    responseFormat: 'json',
  })

  let rawJsonText = cleanJsonText(completion.rawText)
  let parsedResult = parseAndValidateTestCaseSuite(rawJsonText, repositoryFullName, options)

  if (!parsedResult.success) {
    repairAttempted = true
    console.warn('[AI Generator] Initial TestCase JSON validation failed. Attempting repair loop...', parsedResult.error)

    const repairCompletion = await provider.generateCompletion({
      systemPrompt: `${systemPrompt}\n\nREPAIR INSTRUCTION: Previous output failed validation with error:\n${parsedResult.error}\nPlease fix and return ONLY valid JSON matching TestCaseSuiteSchema.`,
      userPrompt: `Corrected JSON output for ${repositoryFullName}.`,
      temperature: 0.1,
      maxTokens: 3500,
      responseFormat: 'json',
    })

    completion = repairCompletion
    rawJsonText = cleanJsonText(repairCompletion.rawText)
    parsedResult = parseAndValidateTestCaseSuite(rawJsonText, repositoryFullName, options)

    if (!parsedResult.success) {
      throw new Error(`[AI Generator] Failed to generate valid grounded TestCases after repair attempt: ${parsedResult.error}`)
    }
  }

  return {
    suite: parsedResult.data!,
    meta: {
      provider: completion.provider,
      model: completion.model,
      promptTokens: completion.usage?.promptTokens,
      completionTokens: completion.usage?.completionTokens,
      totalTokens: completion.usage?.totalTokens,
      repairAttempted,
    },
  }
}

function parseAndValidateTestCaseSuite(
  jsonText: string,
  repoFullName: string,
  options: TestCaseGenerationOptions
): { success: boolean; data?: TestCaseSuite; error?: string } {
  let jsonObj: any
  try {
    jsonObj = JSON.parse(jsonText)
  } catch (err: any) {
    return { success: false, error: `Invalid JSON syntax: ${err?.message || 'JSON parse failed'}` }
  }

  if (!jsonObj.repositoryFullName) jsonObj.repositoryFullName = repoFullName

  const zodResult = TestCaseSuiteSchema.safeParse(jsonObj)
  if (!zodResult.success) {
    const issueMessages = zodResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    return { success: false, error: `Schema validation failed: ${issueMessages}` }
  }

  const suite = zodResult.data
  const inspectedFiles = new Set<string>([
    ...(options.analysis.evidence?.inspectedFiles || []),
    ...(options.sourceFilesMap ? Array.from(options.sourceFilesMap.keys()) : []),
  ])
  const validRoutePaths = new Set(options.analysis.routes.map((r) => r.path))

  for (const tc of suite.testCases) {
    if (!tc.generationKey) {
      tc.generationKey = `${tc.scenarioId || 'SCENARIO'}::${tc.category.toUpperCase()}`
    }

    const validEvidence = tc.sourceEvidence.filter((ev) => {
      const cleanFile = ev.split(':')[0].trim()
      return inspectedFiles.has(cleanFile) || Array.from(inspectedFiles).some((f) => ev.includes(f))
    })

    if (validEvidence.length === 0) {
      tc.groundingStatus = 'needs_review'
    }

    const isKnownRoute = validRoutePaths.has(tc.targetSurface)
    const isKnownFile = inspectedFiles.has(tc.targetSurface) || tc.targetSurface.includes('/')

    if (!isKnownRoute && !isKnownFile) {
      tc.groundingStatus = 'needs_review'
    }
  }

  return { success: true, data: suite }
}

export interface FailureAnalysisOptions {
  repositoryFullName: string
  failure: {
    id: string
    title: string
    errorType: string
    errorMessage: string
    stackTrace?: string | null
    componentAffected?: string | null
  }
  testResult?: {
    title: string
    filePath: string
    durationMs: number
    errorMessage?: string | null
  } | null
  sourceFilesMap?: Map<string, string>
}

export interface FailureAnalysisResult {
  analysis: FailureAnalysis
  meta: {
    provider: string
    model: string
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
    repairAttempted: boolean
  }
}

/**
 * Generates grounded AI root-cause failure analysis using Gemini AI provider.
 */
export async function analyzeFailure(
  options: FailureAnalysisOptions
): Promise<FailureAnalysisResult> {
  const provider = getAIProvider()
  const { repositoryFullName, failure, testResult, sourceFilesMap } = options

  let sourceSnippets = ''
  if (sourceFilesMap && sourceFilesMap.size > 0) {
    const snippets: string[] = []
    for (const [path, content] of sourceFilesMap.entries()) {
      const truncated = content.length > 1000 ? `${content.slice(0, 1000)}\n... [truncated]` : content
      snippets.push(`=== FILE: ${path} ===\n${truncated}`)
    }
    sourceSnippets = snippets.join('\n\n')
  }

  const systemPrompt = `You are TestForge AI, an expert software failure diagnostic engineer.
Your task is to analyze a Playwright test execution failure for repository "${repositoryFullName}" and produce a grounded root-cause analysis.

STRICT GROUNDING & SAFETY RULES:
1. Do NOT invent non-existent source files, selectors, or application behavior.
2. Every root-cause conclusion MUST be grounded strictly in the supplied source code files and Playwright error message.
3. If source evidence is insufficient or missing, state so explicitly and lower the confidenceScore accordingly.
4. Output EXACTLY one valid JSON object. Do NOT output markdown code fences or surrounding text.
5. Keep rootCause, suggestedFix, and analysis concise and direct. Do not repeat the supplied error message verbatim or include unrelated code.`

  const userPrompt = `REPOSITORY: ${repositoryFullName}
FAILED TEST TITLE: ${failure.title}
TARGET SURFACE / ROUTE: ${testResult?.filePath || failure.componentAffected || '/'}
ERROR TYPE: ${failure.errorType}
ERROR MESSAGE: ${failure.errorMessage}
STACK TRACE: ${failure.stackTrace?.slice(0, 300) || 'None available'}

RELEVANT SOURCE CODE FILES:
${sourceSnippets || 'No additional source code snippets attached'}

EXPLICIT JSON SCHEMA CONTRACT:
Return ONLY a valid JSON object containing ALL of the following required fields:
- rootCause: string (concise explanation of why the test failed based on source code and Playwright error)
- confidenceScore: number (decimal between 0.0 and 1.0 reflecting confidence based on evidence)
- suggestedFix: string (concise, actionable description of how to resolve the failure in source code or test definition)
- affectedComponent: string (the exact file path or component name identified in source code, e.g. "src/components/Home.jsx")
- evidence: string[] (array of concrete source code evidence citations e.g. ["src/components/Home.jsx:<button className='btn'>", "Error: .card-button not found"])
- analysis: string (concise diagnostic breakdown)`

  let completion: AICompletionResponse
  try {
    completion = await provider.generateCompletion({
      systemPrompt,
      userPrompt,
      temperature: 0.1,
      maxTokens: 800,
      responseFormat: 'json',
      timeoutMs: 50000,
      maxAttempts: 1,
    })
  } catch (err: any) {
    throw new Error(`[AI Failure Analysis] Provider invocation failed: ${err?.message || err}`)
  }

  let rawJson = cleanJsonText(completion.rawText)
  let parsedResult = parseAndValidateFailureAnalysis(rawJson)
  let repairAttempted = false

  if (!parsedResult.success) {
    repairAttempted = true
    console.warn('[AI Failure Analysis] Initial JSON failed schema validation. Executing repair attempt...', parsedResult.error)

    const repairSystemPrompt = `You are TestForge AI Repair. Your previous JSON output failed schema validation:
${parsedResult.error}

Generate a COMPLETE, valid JSON object matching the exact FailureAnalysisSchema:
- rootCause: string (at least 10 chars, concise)
- confidenceScore: number between 0.0 and 1.0
- suggestedFix: string (at least 10 chars, concise)
- affectedComponent: string (file path)
- evidence: string[] (at least 1 citation)
- analysis: string (at least 10 chars, concise)

Return JSON ONLY. No markdown fences.`

    try {
      const repairCompletion = await provider.generateCompletion({
        systemPrompt: repairSystemPrompt,
        userPrompt,
        temperature: 0.1,
        maxTokens: 800,
        responseFormat: 'json',
        timeoutMs: 50000,
        maxAttempts: 1,
      })
      completion = repairCompletion
      rawJson = cleanJsonText(repairCompletion.rawText)
      parsedResult = parseAndValidateFailureAnalysis(rawJson)
    } catch {
      // Continue to final error check
    }
  }

  if (!parsedResult.success || !parsedResult.data) {
    throw new Error(`[AI Failure Analysis] Validation failed: ${parsedResult.error || 'Failed to produce valid schema'}`)
  }

  return {
    analysis: parsedResult.data,
    meta: {
      provider: completion.provider,
      model: completion.model,
      promptTokens: completion.usage?.promptTokens,
      completionTokens: completion.usage?.completionTokens,
      totalTokens: completion.usage?.totalTokens,
      repairAttempted,
    },
  }
}

function parseAndValidateFailureAnalysis(
  jsonText: string
): { success: boolean; data?: FailureAnalysis; error?: string } {
  let jsonObj: any
  try {
    jsonObj = JSON.parse(jsonText)
  } catch (err: any) {
    return { success: false, error: `Invalid JSON syntax: ${err?.message || 'JSON parse failed'}` }
  }

  if (typeof jsonObj.confidenceScore === 'string') {
    const parsedNum = parseFloat(jsonObj.confidenceScore)
    if (!isNaN(parsedNum)) {
      jsonObj.confidenceScore = parsedNum > 1 ? parsedNum / 100 : parsedNum
    }
  }

  if (typeof jsonObj.evidence === 'string') {
    jsonObj.evidence = [jsonObj.evidence]
  }

  const zodResult = FailureAnalysisSchema.safeParse(jsonObj)
  if (!zodResult.success) {
    const issueMessages = zodResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    return { success: false, error: `Schema validation failed: ${issueMessages}` }
  }

  return { success: true, data: zodResult.data }
}

export interface RepairGenerationOptions {
  repositoryFullName: string
  failure: {
    id: string
    title: string
    errorType: string
    errorMessage: string
  }
  testCase: {
    id: string
    title: string
    steps: Array<{
      stepNumber?: number
      action: string
      target: string
      expected?: string
    }>
  }
  aiAnalysis: {
    rootCause: string
    suggestedFix: string
    affectedComponent: string
  }
  sourceFilesMap?: Map<string, string>
}

export interface RepairGenerationResult {
  proposal: RepairProposal
  meta: {
    provider: string
    model: string
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
    repairAttempted: boolean
  }
}

/**
 * Generates grounded AI repair proposal targeting the failing test locator based on source code and Playwright error evidence.
 */
export async function generateRepairProposal(
  options: RepairGenerationOptions
): Promise<RepairGenerationResult> {
  const provider = getAIProvider()
  const { repositoryFullName, failure, testCase, aiAnalysis, sourceFilesMap } = options

  const errTargetMatch = failure.errorMessage.match(/'([^']+)'/)
  const failingTargetStr = errTargetMatch ? errTargetMatch[1] : '.card-button'

  let failingStepIndex = 0
  let originalLocator = failingTargetStr

  if (Array.isArray(testCase.steps) && testCase.steps.length > 0) {
    const matchedIdx = testCase.steps.findIndex(
      (s) => s.target && (s.target.includes(failingTargetStr) || failingTargetStr.includes(s.target))
    )
    if (matchedIdx !== -1) {
      failingStepIndex = matchedIdx
      originalLocator = testCase.steps[matchedIdx].target
    } else {
      originalLocator = testCase.steps[0].target || failingTargetStr
    }
  }

  let sourceSnippets = ''
  if (sourceFilesMap && sourceFilesMap.size > 0) {
    const snippets: string[] = []
    for (const [path, content] of sourceFilesMap.entries()) {
      const truncated = content.length > 1000 ? `${content.slice(0, 1000)}\n... [truncated]` : content
      snippets.push(`=== FILE: ${path} ===\n${truncated}`)
    }
    sourceSnippets = snippets.join('\n\n')
  }

  const systemPrompt = `You are TestForge AI, an autonomous software test repair engineer.
Your task is to generate a grounded, minimal AI Repair Proposal for a Playwright test failure in "${repositoryFullName}".

STRICT GROUNDING & SAFETY RULES:
1. ONLY repair the failing test step's locator ("test_locator"). Do NOT modify application source code unless evidence proves an application bug.
2. The failing selector is currently generic/ambiguous. Choose a more specific, unique locator grounded in the supplied component source code.
3. Target locator should uniquely identify the intended element based on the step description and title.
4. Do NOT output markdown code fences or surrounding text. Return strictly a single valid JSON object matching RepairProposalSchema.
5. Provide a clear logical diff representation in diffContent showing:
Test case: ${testCase.id}
Step: ${failingStepIndex}
- locator: "${originalLocator}"
+ locator: "<proposed_locator>"`

  const userPrompt = `REPOSITORY: ${repositoryFullName}
FAILED TEST TITLE: ${failure.title}
TEST CASE ID: ${testCase.id}
FAILING STEP INDEX: ${failingStepIndex}
ORIGINAL LOCATOR: ${originalLocator}
ERROR MESSAGE: ${failure.errorMessage}
AI ROOT CAUSE: ${aiAnalysis.rootCause}
AI SUGGESTED FIX: ${aiAnalysis.suggestedFix}
AFFECTED COMPONENT: ${aiAnalysis.affectedComponent}

TEST CASE STEPS:
${JSON.stringify(testCase.steps, null, 2)}

RELEVANT SOURCE CODE FILES:
${sourceSnippets || 'No additional source code snippets attached'}

EXPLICIT JSON SCHEMA CONTRACT:
Return ONLY a valid JSON object containing ALL of the following required fields:
- failureId: "${failure.id}"
- repairType: "test_locator"
- target: {
    "kind": "test_case_step",
    "testCaseId": "${testCase.id}",
    "stepIndex": ${failingStepIndex}
  }
- originalValue: "${originalLocator}"
- proposedValue: string (the refined, grounded unique locator e.g. "button:has-text(\"Create Quiz\")" or ".quiz-card:has-text(\"Create Quiz\") button")
- diffContent: string (logical diff showing original vs proposed locator)
- explanation: string (concise rationale explaining why the proposed locator uniquely identifies the intended button in source code)
- verificationPlan: string[] (array of concrete verification steps e.g. ["Rerun SCENARIO-001 in Playwright test runner", "Verify click on Create Quiz succeeds without selector timeout"])`

  let completion: AICompletionResponse
  try {
    completion = await provider.generateCompletion({
      systemPrompt,
      userPrompt,
      temperature: 0.1,
      maxTokens: 800,
      responseFormat: 'json',
      timeoutMs: 50000,
      maxAttempts: 1,
    })
  } catch (err: any) {
    throw new Error(`[AI Repair Proposal] Provider invocation failed: ${err?.message || err}`)
  }

  let rawJson = cleanJsonText(completion.rawText)
  let parsedResult = parseAndValidateRepairProposal(
    rawJson,
    failure.id,
    testCase.id,
    failingStepIndex,
    originalLocator
  )
  let repairAttempted = false

  if (!parsedResult.success) {
    repairAttempted = true
    console.warn('[AI Repair Proposal] Initial JSON failed schema validation. Executing repair attempt...', parsedResult.error)

    const repairSystemPrompt = `You are TestForge AI Repair. Your previous JSON output failed validation:
${parsedResult.error}

Generate a COMPLETE, valid JSON object matching RepairProposalSchema:
- failureId: "${failure.id}"
- repairType: "test_locator"
- target: { "kind": "test_case_step", "testCaseId": "${testCase.id}", "stepIndex": ${failingStepIndex} }
- originalValue: "${originalLocator}"
- proposedValue: string (valid locator string)
- diffContent: string (logical diff)
- explanation: string (at least 10 chars)
- verificationPlan: string[] (at least 1 step)

Return JSON ONLY. No markdown fences.`

    try {
      const repairCompletion = await provider.generateCompletion({
        systemPrompt: repairSystemPrompt,
        userPrompt,
        temperature: 0.1,
        maxTokens: 800,
        responseFormat: 'json',
        timeoutMs: 50000,
        maxAttempts: 1,
      })
      completion = repairCompletion
      rawJson = cleanJsonText(repairCompletion.rawText)
      parsedResult = parseAndValidateRepairProposal(
        rawJson,
        failure.id,
        testCase.id,
        failingStepIndex,
        originalLocator
      )
    } catch {
      // Continue to final validation check
    }
  }

  if (!parsedResult.success || !parsedResult.data) {
    throw new Error(`[AI Repair Proposal] Validation failed: ${parsedResult.error || 'Failed to produce valid schema'}`)
  }

  return {
    proposal: parsedResult.data,
    meta: {
      provider: completion.provider,
      model: completion.model,
      promptTokens: completion.usage?.promptTokens,
      completionTokens: completion.usage?.completionTokens,
      totalTokens: completion.usage?.totalTokens,
      repairAttempted,
    },
  }
}

function parseAndValidateRepairProposal(
  jsonText: string,
  expectedFailureId: string,
  expectedTestCaseId: string,
  expectedStepIndex: number,
  expectedOriginalValue: string
): { success: boolean; data?: RepairProposal; error?: string } {
  let jsonObj: any
  try {
    jsonObj = JSON.parse(jsonText)
  } catch (err: any) {
    return { success: false, error: `Invalid JSON syntax: ${err?.message || 'JSON parse failed'}` }
  }

  if (!jsonObj.failureId) jsonObj.failureId = expectedFailureId
  if (!jsonObj.repairType) jsonObj.repairType = 'test_locator'
  if (!jsonObj.target) jsonObj.target = {}
  jsonObj.target.kind = 'test_case_step'
  jsonObj.target.testCaseId = expectedTestCaseId
  jsonObj.target.stepIndex = expectedStepIndex
  if (!jsonObj.originalValue) jsonObj.originalValue = expectedOriginalValue

  if (typeof jsonObj.verificationPlan === 'string') {
    jsonObj.verificationPlan = [jsonObj.verificationPlan]
  }

  const zodResult = RepairProposalSchema.safeParse(jsonObj)
  if (!zodResult.success) {
    const issueMessages = zodResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    return { success: false, error: `Schema validation failed: ${issueMessages}` }
  }

  const proposal = zodResult.data

  if (proposal.proposedValue === proposal.originalValue) {
    return { success: false, error: 'Proposed locator must be different from original locator' }
  }

  return { success: true, data: proposal }
}


