import { chromium, Browser, BrowserContext, Page } from 'playwright'
import {
  RunSuiteOptions,
  SingleTestResult,
  SuiteExecutionSummary,
  FailureType,
} from './types'
import { parseTestCaseMetadata, normalizeStep } from './step-normalizer'

import { validateTargetUrl } from '../utils/url-validator'

const DEFAULT_ACTION_TIMEOUT = 10_000 // 10s
const DEFAULT_TEST_TIMEOUT = 30_000 // 30s
const DEFAULT_SUITE_TIMEOUT = 120_000 // 120s

/**
 * Server-side Playwright Execution Engine for TestForge MVP.
 * Executes tests against a target application URL (configurable per repository, fallback: http://localhost:5173).
 */
export class PlaywrightExecutor {
  private baseUrl: string
  private actionTimeout: number
  private testTimeout: number
  private suiteTimeout: number

  constructor(options?: Partial<RunSuiteOptions>) {
    let resolvedUrl: string | null = null
    if (options?.baseUrl) {
      const val = validateTargetUrl(options.baseUrl)
      if (val.isValid && val.normalizedUrl) {
        resolvedUrl = val.normalizedUrl
      }
    }

    this.baseUrl = (
      resolvedUrl ||
      process.env.TARGET_APP_BASE_URL ||
      'http://localhost:5173'
    ).replace(/\/$/, '')
    this.actionTimeout = options?.actionTimeoutMs ?? DEFAULT_ACTION_TIMEOUT
    this.testTimeout = options?.testTimeoutMs ?? DEFAULT_TEST_TIMEOUT
    this.suiteTimeout = options?.suiteTimeoutMs ?? DEFAULT_SUITE_TIMEOUT
  }

  public getBaseUrl(): string {
    return this.baseUrl
  }

  /**
   * Run a suite of Test Cases using a single Playwright Chromium instance.
   */
  public async executeSuite(testCases: any[]): Promise<SuiteExecutionSummary> {
    const startTime = Date.now()
    const results: SingleTestResult[] = []

    let browser: Browser | null = null
    let context: BrowserContext | null = null

    try {
      // 1. Launch single browser instance per run with fallback channels for Windows environment
      try {
        browser = await chromium.launch({ channel: 'msedge', headless: true })
      } catch {
        try {
          browser = await chromium.launch({ channel: 'chrome', headless: true })
        } catch {
          browser = await chromium.launch({ headless: true })
        }
      }

      // 2. Create isolated browser context per run
      context = await browser.newContext({
        baseURL: this.baseUrl,
        viewport: { width: 1280, height: 720 },
      })
      context.setDefaultTimeout(this.actionTimeout)

      // 3. Iterate test cases
      for (const tc of testCases) {
        if (Date.now() - startTime > this.suiteTimeout) {
          results.push({
            testCaseId: tc.id,
            title: tc.title || 'Untitled Test',
            filePath: tc.file_path || '/',
            status: 'skipped',
            durationMs: 0,
            errorMessage: 'Test skipped due to suite timeout limit (120s)',
          })
          continue
        }

        const singleResult = await this.executeSingleTestCase(context, tc)
        results.push(singleResult)
      }
    } catch (err: any) {
      console.error('Playwright suite execution critical error:', err)
    } finally {
      if (context) {
        await context.close().catch(() => {})
      }
      if (browser) {
        await browser.close().catch(() => {})
      }
    }

    const durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000))
    const passedTests = results.filter((r) => r.status === 'passed').length
    const failedTests = results.filter((r) => r.status === 'failed').length
    const skippedTests = results.filter((r) => r.status === 'skipped').length
    const status = failedTests > 0 ? 'failed' : 'passed'

    return {
      status,
      totalTests: testCases.length,
      passedTests,
      failedTests,
      skippedTests,
      durationSeconds,
      results,
    }
  }

  /**
   * Execute a single TestCase in a fresh Page.
   */
  private async executeSingleTestCase(
    context: BrowserContext,
    tc: any
  ): Promise<SingleTestResult> {
    const testStartTime = Date.now()
    const meta = parseTestCaseMetadata(tc.description)
    const rawSteps = meta.steps || []
    const targetSurface = tc.file_path || '/'

    let page: Page | null = null
    try {
      page = await context.newPage()
      page.setDefaultTimeout(this.actionTimeout)

      const initialDestUrl = targetSurface.startsWith('http')
        ? targetSurface
        : `${this.baseUrl}${targetSurface.startsWith('/') ? '' : '/'}${targetSurface}`

      if (rawSteps.length === 0) {
        await page.goto(initialDestUrl, { waitUntil: 'domcontentloaded' })
      } else {
        const firstNorm = normalizeStep(rawSteps[0])
        if (firstNorm.actionType !== 'navigate') {
          await page.goto(initialDestUrl, { waitUntil: 'domcontentloaded' })
        }
        for (const rawStep of rawSteps) {
          const norm = normalizeStep(rawStep)
          await this.executeNormalizedStep(page, norm, targetSurface)
        }
      }

      const durationMs = Date.now() - testStartTime
      return {
        testCaseId: tc.id,
        title: tc.title || 'Untitled Test',
        filePath: targetSurface,
        status: 'passed',
        durationMs,
      }
    } catch (error: any) {
      const durationMs = Date.now() - testStartTime
      let screenshotBuffer: Buffer | undefined
      if (page) {
        try {
          screenshotBuffer = await page.screenshot({ type: 'png', fullPage: true })
        } catch {
          // Ignore screenshot failure
        }
      }

      const rawMsg = error?.message || String(error)
      const stack = error?.stack || ''
      const failureType = this.classifyFailureType(rawMsg, error)

      return {
        testCaseId: tc.id,
        title: tc.title || 'Untitled Test',
        filePath: targetSurface,
        status: 'failed',
        durationMs,
        errorMessage: rawMsg,
        errorStack: stack,
        failureType,
        screenshotBuffer,
        artifactFileName: `failure_${tc.id}_${Date.now()}.png`,
      }
    } finally {
      if (page) {
        await page.close().catch(() => {})
      }
    }
  }

  private async executeNormalizedStep(
    page: Page,
    step: ReturnType<typeof normalizeStep>,
    defaultSurface: string
  ): Promise<void> {
    const { actionType, target, value, originalText } = step

    switch (actionType) {
      case 'navigate': {
        const targetPath = target || defaultSurface || '/'
        const fullUrl = targetPath.startsWith('http')
          ? targetPath
          : `${this.baseUrl}${targetPath.startsWith('/') ? '' : '/'}${targetPath}`
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded' })
        break
      }

      case 'fill': {
        const inputLocator = await this.resolveInputLocator(page, target)
        await inputLocator.fill(value || 'Test Input')
        break
      }

      case 'click': {
        const clickLocator = await this.resolveClickLocator(page, target)
        await clickLocator.click()
        await page.waitForTimeout(300)
        break
      }

      case 'assertion': {
        if (target && target.startsWith('/')) {
          await page.waitForURL(`**${target}*`, { timeout: 3000 }).catch(() => {})
          const currentUrl = page.url()
          if (!currentUrl.includes(target)) {
            throw new Error(`Assertion failed: Expected URL to include '${target}', but got '${currentUrl}'`)
          }
        } else if (target) {
          const loc = page.getByText(target, { exact: false })
          const isVisible = await loc.first().isVisible().catch(() => false)
          if (!isVisible) {
            throw new Error(`Assertion failed: Expected page to display text '${target}'`)
          }
        }
        break
      }

      case 'unknown':
      default: {
        console.warn(`Ambiguous step skipped: "${originalText}"`)
        break
      }
    }
  }

  private async resolveInputLocator(page: Page, target?: string) {
    if (!target) {
      return page.locator('input').first()
    }

    if (this.isValidCssSelector(target)) {
      const loc = page.locator(target)
      if ((await loc.count()) > 0) return loc.first()
    }

    const labelLoc = page.getByLabel(target)
    if ((await labelLoc.count()) > 0) return labelLoc.first()

    const placeholderLoc = page.getByPlaceholder(target, { exact: false })
    if ((await placeholderLoc.count()) > 0) return placeholderLoc.first()

    const roleLoc = page.getByRole('textbox', { name: target })
    if ((await roleLoc.count()) > 0) return roleLoc.first()

    const fallbackInput = page.locator(`input[placeholder*="${target}" i], input[name*="${target}" i]`)
    if ((await fallbackInput.count()) > 0) return fallbackInput.first()

    // Deterministic failure when target selector does not match any element
    throw new Error(`Element not found: Unable to find input element matching target '${target}'`)
  }

  private async resolveClickLocator(page: Page, target?: string) {
    if (!target) {
      return page.locator('button, a, input[type="submit"]').first()
    }

    if (this.isValidCssSelector(target)) {
      const loc = page.locator(target)
      if ((await loc.count()) > 0) return loc.first()
    }

    const buttonLoc = page.getByRole('button', { name: target, exact: false })
    if ((await buttonLoc.count()) > 0) return buttonLoc.first()

    const linkLoc = page.getByRole('link', { name: target, exact: false })
    if ((await linkLoc.count()) > 0) return linkLoc.first()

    const textLoc = page.getByText(target, { exact: false })
    if ((await textLoc.count()) > 0) return textLoc.first()

    // Deterministic failure when target selector does not match any element
    throw new Error(`Element not found: Unable to find clickable element matching target '${target}'`)
  }

  private isValidCssSelector(target: string): boolean {
    if (target.startsWith('#') || target.startsWith('.') || target.includes('[') || target.includes('>')) {
      return true
    }
    return false
  }

  private classifyFailureType(msg: string, err: any): FailureType {
    const lower = msg.toLowerCase()
    if (
      lower.includes('timeout') ||
      lower.includes('timed out') ||
      err?.name === 'TimeoutError'
    ) {
      return 'timeout'
    }
    if (
      lower.includes('assertion') ||
      lower.includes('expected') ||
      lower.includes('expect(') ||
      lower.includes('to be')
    ) {
      return 'assertion_failure'
    }
    if (
      lower.includes('element not found') ||
      lower.includes('locator') ||
      lower.includes('element') ||
      lower.includes('not found') ||
      lower.includes('strict mode violation') ||
      lower.includes('resolved to')
    ) {
      return 'element_not_found'
    }

    return 'element_not_found'
  }
}
