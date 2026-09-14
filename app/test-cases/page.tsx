import { Sparkles } from 'lucide-react'
import { PageHeader, PrimaryButton } from '@/components/primitives'
import { TestCasesTable } from '@/components/test-cases-table'

export const metadata = { title: 'Test Cases · TestPilot AI' }

export default function TestCasesPage() {
  return (
    <>
      <PageHeader
        crumb="Test Cases"
        title="Test cases"
        description="AI-generated and manually configured test scenarios."
        action={<PrimaryButton icon={Sparkles}>Generate tests</PrimaryButton>}
      />
      <TestCasesTable />
    </>
  )
}
