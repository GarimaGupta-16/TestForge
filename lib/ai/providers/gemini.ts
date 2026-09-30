import 'server-only'
import type { AICompletionRequest, AICompletionResponse, AIProvider } from '../types'

export class GeminiProvider implements AIProvider {
  id = 'gemini'
  name = 'Google Gemini 3.5 Flash Lite'

  async generateCompletion(request: AICompletionRequest): Promise<AICompletionResponse> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY

    if (!apiKey) {
      throw new Error('[Gemini Provider] GEMINI_API_KEY environment variable is not configured on server.')
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`

    const contents = [
      {
        role: 'user',
        parts: [
          { text: `${request.systemPrompt}\n\n${request.userPrompt}` }
        ]
      }
    ]

    const bodyPayload: any = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? 0.2,
        maxOutputTokens: request.maxTokens ?? 4000,
      }
    }

    if (request.responseFormat === 'json') {
      bodyPayload.generationConfig.responseMimeType = 'application/json'
    }

    const maxAttempts = request.maxAttempts ?? 3
    const transientStatuses = [429, 500, 503, 504]
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = request.timeoutMs ? new AbortController() : null
      const timeoutId = controller && request.timeoutMs
        ? setTimeout(() => controller.abort(), request.timeoutMs)
        : null

      try {
        const fetchOptions: RequestInit = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bodyPayload),
        }
        if (controller) {
          fetchOptions.signal = controller.signal
        }

        const res = await fetch(endpoint, fetchOptions)

        if (!res.ok) {
          const errText = await res.text().catch(() => '')
          const sanitizedErr = errText ? errText.replace(new RegExp(apiKey, 'g'), '[REDACTED]') : ''
          const status = res.status

          if (transientStatuses.includes(status) && attempt < maxAttempts) {
            const delayMs = attempt * 1000
            console.warn(`[Gemini Provider] Transient HTTP ${status} on attempt ${attempt}/${maxAttempts}. Retrying in ${delayMs}ms...`)
            await new Promise((resolve) => setTimeout(resolve, delayMs))
            continue
          }

          if (status === 503) {
            throw new Error(`[Gemini Provider] Google Gemini API is temporarily experiencing high demand (503). Please try again in a moment.`)
          } else if (status === 429) {
            throw new Error(`[Gemini Provider] Gemini API rate limit exceeded (429). Please try again in a moment.`)
          } else {
            throw new Error(`[Gemini Provider] API returned status ${status}: ${sanitizedErr.slice(0, 200)}`)
          }
        }

        const data = await res.json()

        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (!rawText) {
          throw new Error('[Gemini Provider] No text candidate returned in model response.')
        }

        const promptTokens = data?.usageMetadata?.promptTokenCount || 0
        const completionTokens = data?.usageMetadata?.candidatesTokenCount || 0

        return {
          rawText,
          provider: 'gemini',
          model: modelName,
          usage: {
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
          },
        }
      } catch (err: any) {
        let isTimeout = false
        if (controller?.signal.aborted || err?.name === 'AbortError') {
          isTimeout = true
          lastError = new Error(`[Gemini Provider] Request timed out after ${request.timeoutMs}ms.`)
        } else {
          lastError = err instanceof Error ? err : new Error(String(err))
        }

        // Sanitize error message to ensure API key is never exposed
        if (apiKey && lastError.message) {
          lastError.message = lastError.message.replace(new RegExp(apiKey, 'g'), '[REDACTED]')
        }

        const isNonTransientHttp = /API returned status (400|401|403|404)/.test(lastError.message)

        if (attempt < maxAttempts && !lastError.message.includes('GEMINI_API_KEY') && !isNonTransientHttp) {
          const delayMs = attempt * 1000
          console.warn(`[Gemini Provider] ${isTimeout ? 'Timeout' : 'Transient error'} on attempt ${attempt}/${maxAttempts}. Retrying in ${delayMs}ms...`)
          await new Promise((resolve) => setTimeout(resolve, delayMs))
          continue
        }
        throw lastError
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
      }
    }

    throw lastError || new Error('[Gemini Provider] Failed to generate completion after maximum retries.')
  }
}
