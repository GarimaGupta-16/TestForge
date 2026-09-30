import 'server-only'

export interface AICompletionRequest {
  systemPrompt: string
  userPrompt: string
  temperature?: number
  maxTokens?: number
  responseFormat?: 'json'
  timeoutMs?: number
  maxAttempts?: number
}

export interface AICompletionResponse {
  rawText: string
  provider: string
  model: string
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}

export interface AIProvider {
  id: string
  name: string
  generateCompletion(request: AICompletionRequest): Promise<AICompletionResponse>
}
