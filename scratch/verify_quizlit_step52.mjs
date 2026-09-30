import { chromium } from 'playwright'
import fs from 'fs'

async function runVerification() {
  console.log('=== STARTING PLAYWRIGHT VERIFICATION FOR STEP 5.2 (QUIZLIT) ===')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // 1. Navigate to localhost:3000
    console.log('Navigating to http://localhost:3000...')
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' })

    // Check if login form is present
    const emailInput = await page.$('input[type="email"]')
    if (emailInput) {
      console.log('Signing in with developer@testforge.dev...')
      await emailInput.fill('developer@testforge.dev')
      const passwordInput = await page.$('input[type="password"]')
      if (passwordInput) {
        await passwordInput.fill('password123')
      }
      const submitBtn = await page.$('button[type="submit"]')
      if (submitBtn) {
        await submitBtn.click()
        await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {})
      }
    }

    // 2. Navigate directly to /test-runs
    console.log('Navigating to http://localhost:3000/test-runs...')
    await page.goto('http://localhost:3000/test-runs', { waitUntil: 'networkidle' })
    await page.screenshot({ path: 'scratch/test_runs_page.png' })

    // 3. Inspect repository filter
    console.log('Inspecting repository filter selector...')
    const selectElem = await page.$('select[aria-label="Filter by repository"]')
    if (!selectElem) {
      console.error('ERROR: Repository filter select not found!')
    } else {
      const options = await selectElem.$$eval('option', (opts) =>
        opts.map((o) => ({ value: o.value, text: o.textContent }))
      )
      console.log('Filter options:', options)

      // Find QuizLit option
      const quizlitOpt = options.find(
        (o) => o.text.includes('Quizlit') || o.text.includes('quizlit')
      )

      if (quizlitOpt && quizlitOpt.value) {
        console.log(`Selecting QuizLit filter (value=${quizlitOpt.value})...`)
        await selectElem.selectOption(quizlitOpt.value)
        await page.waitForTimeout(1000)
        console.log('Updated URL:', page.url())
        await page.screenshot({ path: 'scratch/quizlit_filtered_page.png' })
      } else {
        console.log('QuizLit filter option not explicitly found in options:', options)
      }
    }

    // 4. Click a run row
    console.log('Clicking first test run row in table...')
    const firstRow = await page.$('tbody tr')
    if (!firstRow) {
      console.log('No rows found in tbody!')
    } else {
      const rowText = await firstRow.textContent()
      console.log('Selected row text:', rowText?.trim())
      await firstRow.click()
      await page.waitForTimeout(1500)

      // 5. Inspect RunDetailsSheet
      console.log('Checking for RunDetailsSheet (aside)...')
      const sheet = await page.$('aside')
      if (!sheet) {
        console.error('ERROR: RunDetailsSheet (aside) did not open!')
      } else {
        await page.screenshot({ path: 'scratch/run_details_sheet.png' })
        const sheetText = await sheet.textContent()
        console.log('=== RUN DETAILS SHEET CONTENT ===\n', sheetText)

        // Check specific fields
        const hasRepo = sheetText.includes('Quizlit') || sheetText.includes('QuizLit') || sheetText.includes('Repository')
        const hasStatus = sheetText.includes('PASSED') || sheetText.includes('FAILED') || sheetText.includes('Passed') || sheetText.includes('Failed')
        const hasDuration = sheetText.includes('Duration')
        const hasStarted = sheetText.includes('Started')
        const hasCompleted = sheetText.includes('Completed')
        const hasBranch = sheetText.includes('Branch')
        const hasCommit = sheetText.includes('Commit')
        const hasResults = sheetText.includes('Test Case Results')
        const hasArtifacts = sheetText.includes('Execution Artifacts')

        console.log('Verification checks:', {
          hasRepo,
          hasStatus,
          hasDuration,
          hasStarted,
          hasCompleted,
          hasBranch,
          hasCommit,
          hasResults,
          hasArtifacts,
        })

        // Check if screenshots render
        const imgs = await sheet.$$eval('img', (imgs) => imgs.map((i) => i.src))
        console.log('Sheet images found:', imgs)

        // 6. Test Close button
        console.log('Testing close button X...')
        const closeBtn = await sheet.$('button[aria-label="Close panel"]')
        if (closeBtn) {
          await closeBtn.click()
          await page.waitForTimeout(500)
          const sheetClosed = (await page.$('aside')) === null
          console.log('Sheet closed cleanly:', sheetClosed)
        }
      }
    }
  } catch (err) {
    console.error('Playwright verification error:', err)
  } finally {
    await browser.close()
    console.log('=== PLAYWRIGHT VERIFICATION FINISHED ===')
  }
}

runVerification()
