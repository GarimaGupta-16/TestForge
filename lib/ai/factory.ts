import 'server-only'
import type { AIProvider } from './types'
import { GeminiProvider } from './providers/gemini'

export function getAIProvider(): AIProvider {
  const providerId = (process.env.AI_PROVIDER || 'gemini').toLowerCase().trim()

  switch (providerId) {
    case 'gemini':
    default:
      return new GeminiProvider()
  }
}
