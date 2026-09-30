import { PageHeader } from '@/components/primitives'
import { TestCasesTable } from '@/components/test-cases-table'

export const metadata = { title: 'Test Cases · TestForge' }

export default function TestCasesPage() {
  return (
    <>
      <PageHeader
        crumb="Test Cases"
        title="Test cases"
        description="Grounded AI-generated executable test cases derived from your repository analysis and TestPlan."
      />
      <TestCasesTable />
    </>
  )
}
