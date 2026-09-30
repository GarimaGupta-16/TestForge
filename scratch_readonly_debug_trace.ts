import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env: Record<string, string> = {};
for (const line of envFile.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const idx = trimmed.indexOf('=');
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
}

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']);

export function extractProposedLocator(diffContent: string | null | undefined): string | null {
  if (!diffContent) return null;
  const lines = diffContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('+') && trimmed.includes('locator:')) {
      const idx = trimmed.indexOf('locator:');
      let rawVal = trimmed.slice(idx + 'locator:'.length).trim();
      if (!rawVal) continue;
      if (
        (rawVal.startsWith('"') && rawVal.endsWith('"') && rawVal.length >= 2) ||
        (rawVal.startsWith("'") && rawVal.endsWith("'") && rawVal.length >= 2)
      ) {
        rawVal = rawVal.slice(1, -1).trim();
      }
      return rawVal;
    }
  }
  return null;
}

export function parseTestCaseMetadata(description: string | null | undefined) {
  if (!description) return { steps: [] };
  const metaMatch = description.match(/<!-- TESTFORGE_META:([\s\S]*?) -->/);
  if (metaMatch) {
    try {
      return JSON.parse(metaMatch[1]);
    } catch {
      return { steps: [] };
    }
  }
  return { steps: [] };
}

async function main() {
  console.log('=== READ-ONLY AUTHENTICATED RUNTIME TRACE ===');

  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'developer@testforge.dev',
    password: 'password123'
  });
  if (authErr) {
    console.error('Auth error:', authErr);
    return;
  }
  console.log('Authenticated user:', auth.user.id);
  
  // 1. Fetch failure
  const { data: failure, error: failErr } = await supabase
    .from('failures')
    .select('*')
    .eq('id', '71cf4d00-27bc-4849-b2b8-22ada1921dd5')
    .single();

  console.log('Failure err:', failErr);

  // 2. Fetch test case
  let testCaseData: any = null;
  if (failure?.test_result_id) {
    const { data: trData } = await supabase
      .from('test_results')
      .select('test_case_id')
      .eq('id', failure.test_result_id)
      .maybeSingle();
    console.log('Test result:', trData);
    if (trData?.test_case_id) {
      const { data: tcData } = await supabase
        .from('test_cases')
        .select('*')
        .eq('id', trData.test_case_id)
        .maybeSingle();
      testCaseData = tcData;
    }
  }

  if (!testCaseData) {
    const { data: tcByTitle } = await supabase
      .from('test_cases')
      .select('*')
      .eq('id', 'bbf31741-e346-4e7b-a86d-afe3dcb5cc11')
      .maybeSingle();
    testCaseData = tcByTitle;
  }

  console.log('Loaded Test Case ID:', testCaseData?.id);
  console.log('Test Case description:', testCaseData?.description);
  const meta = parseTestCaseMetadata(testCaseData?.description);
  console.log('Parsed steps:', JSON.stringify(meta.steps, null, 2));

  // 3. Query ai_repairs for failureId
  const { data: repairs, error: repErr } = await supabase
    .from('ai_repairs')
    .select('*')
    .eq('failure_id', '71cf4d00-27bc-4849-b2b8-22ada1921dd5')
    .order('updated_at', { ascending: false });

  console.log('AI Repairs count:', repairs?.length, repErr);
  const aiRepair = repairs?.[0];
  console.log('Selected aiRepair row:', JSON.stringify({
    id: aiRepair?.id,
    status: aiRepair?.status,
    updated_at: aiRepair?.updated_at,
    diff_content: aiRepair?.diff_content
  }, null, 2));

  // 4. Runtime step evaluation logic as executed by apply/route.ts
  const stepIndex = 0;
  const steps = meta.steps || [];
  let currentStepTarget = '.card-button';
  if (steps.length > 0 && steps[stepIndex]) {
    currentStepTarget = typeof steps[stepIndex] === 'string' ? steps[stepIndex] : (steps[stepIndex].target || '.card-button');
  }

  let proposedLocator = ".quiz-card:has-text('Create Quiz') button";
  if (aiRepair?.diff_content) {
    const extracted = extractProposedLocator(aiRepair.diff_content);
    if (extracted) {
      proposedLocator = extracted;
    }
  }

  const originalValue = '.card-button';
  const revisionBaseline = ".quiz-card:has-text('Create Quiz')";

  const normCurrent = currentStepTarget.replace(/'/g, '"').trim();
  const normOriginal = originalValue.replace(/'/g, '"').trim();
  const normRevision = revisionBaseline.replace(/'/g, '"').trim();
  const normProposed = proposedLocator.replace(/'/g, '"').trim();

  const isOriginal = normCurrent === normOriginal || currentStepTarget === originalValue || currentStepTarget.includes(originalValue);
  const isRevision = normCurrent === normRevision || currentStepTarget === revisionBaseline || (currentStepTarget.includes('.quiz-card:has-text') && !currentStepTarget.includes('button'));
  const isProposed =
    normCurrent === normProposed ||
    currentStepTarget === proposedLocator ||
    (currentStepTarget.includes('.quiz-card:has-text') && currentStepTarget.includes('button'));

  console.log('\n--- EXACT RUNTIME VALUES ---');
  console.log('currentStepTarget:', JSON.stringify(currentStepTarget));
  console.log('stepIndex:', stepIndex);
  console.log('current step action:', steps[stepIndex]?.action);
  console.log('originalValue:', JSON.stringify(originalValue));
  console.log('revisionBaseline:', JSON.stringify(revisionBaseline));
  console.log('proposedLocator:', JSON.stringify(proposedLocator));
  console.log('normCurrent:', JSON.stringify(normCurrent));
  console.log('normOriginal:', JSON.stringify(normOriginal));
  console.log('normRevision:', JSON.stringify(normRevision));
  console.log('normProposed:', JSON.stringify(normProposed));
  console.log('isOriginal:', isOriginal);
  console.log('isRevision:', isRevision);
  console.log('isProposed:', isProposed);
  console.log('409 triggered?:', (!isOriginal && !isRevision && !isProposed));

  // Clean up
  fs.unlinkSync('scratch_readonly_debug_trace.ts');
}

main().catch(console.error);
