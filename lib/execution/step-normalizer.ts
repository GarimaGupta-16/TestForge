import { NormalizedStep, StepActionType } from './types'

export interface TestCaseMetadata {
  objective?: string
  scenarioId?: string
  generationKey?: string
  priority?: 'HIGH' | 'MEDIUM' | 'LOW'
  steps?: Array<any>
  expectedResults?: string
  sourceEvidence?: string[]
  groundingStatus?: string
  automationCandidate?: boolean
}

export function parseTestCaseMetadata(description: string | null | undefined): TestCaseMetadata {
  if (!description) return {}

  if (description.includes('<!-- TESTFORGE_META:')) {
    try {
      const jsonStr = description.split('<!-- TESTFORGE_META:')[1].split('-->')[0].trim()
      return JSON.parse(jsonStr)
    } catch {
      // Fallback
    }
  }

  try {
    return JSON.parse(description)
  } catch {
    // Ignore non-json
  }

  return {}
}

export function normalizeStep(step: any): NormalizedStep {
  let actionStr = ''
  let targetStr = ''
  let valueStr = ''

  if (typeof step === 'string') {
    actionStr = step
  } else if (step && typeof step === 'object') {
    actionStr = step.action || step.step || step.instruction || ''
    targetStr = step.target || step.element || step.selector || ''
    valueStr = step.value || step.text || step.input || ''
  }

  const lowerAction = actionStr.toLowerCase()

  let actionType: StepActionType = 'unknown'

  // Classify action type deterministically
  if (
    lowerAction.includes('navigate') ||
    lowerAction.includes('open') ||
    lowerAction.includes('visit') ||
    lowerAction.startsWith('go to')
  ) {
    actionType = 'navigate'
  } else if (
    lowerAction.includes('fill') ||
    lowerAction.includes('type') ||
    lowerAction.includes('enter') ||
    lowerAction.includes('input')
  ) {
    actionType = 'fill'
  } else if (
    lowerAction.includes('click') ||
    lowerAction.includes('press') ||
    lowerAction.includes('submit')
  ) {
    actionType = 'click'
  } else if (
    lowerAction.includes('assert') ||
    lowerAction.includes('verify') ||
    lowerAction.includes('check') ||
    lowerAction.includes('expect') ||
    lowerAction.includes('should')
  ) {
    actionType = 'assertion'
  }

  // Extract target if not explicitly passed
  if (!targetStr) {
    if (actionType === 'navigate') {
      const urlMatch = actionStr.match(/(\/[a-zA-Z0-9_\-\/]*)/)
      if (urlMatch) targetStr = urlMatch[1]
    } else if (actionType === 'fill') {
      const inMatch = actionStr.match(/(?:into|in|on)\s+['"]?([^'"]+)['"]?/i)
      if (inMatch) targetStr = inMatch[1]
    } else if (actionType === 'click') {
      const clickMatch = actionStr.match(/click\s+(?:the\s+)?['"]?([^'"]+)['"]?/i)
      if (clickMatch) targetStr = clickMatch[1]
    }
  }

  // Extract value if not explicitly passed for fill
  if (actionType === 'fill' && !valueStr) {
    const valMatch = actionStr.match(/['"]([^'"]+)['"]/)
    if (valMatch) valueStr = valMatch[1]
  }

  return {
    originalText: typeof step === 'string' ? step : JSON.stringify(step),
    actionType,
    target: targetStr || undefined,
    value: valueStr || undefined,
  }
}
