import fs from 'fs/promises'
import path from 'path'

// Private storage directory OUTSIDE of public/ to ensure artifacts are not accessible by default
const PRIVATE_ARTIFACTS_DIR = path.join(process.cwd(), 'storage', 'artifacts')

export async function savePrivateArtifact(
  runId: string,
  filename: string,
  buffer: Buffer
): Promise<{ fileUrl: string; sizeBytes: number; relativePath: string }> {
  const runDir = path.join(PRIVATE_ARTIFACTS_DIR, runId)
  await fs.mkdir(runDir, { recursive: true })

  const filePath = path.join(runDir, filename)
  await fs.writeFile(filePath, buffer)

  const sizeBytes = buffer.length
  // Relative path or endpoint metadata stored in file_url
  const relativePath = `storage/artifacts/${runId}/${filename}`
  const fileUrl = relativePath

  return { fileUrl, sizeBytes, relativePath }
}

export async function readPrivateArtifact(runId: string, filename: string): Promise<Buffer | null> {
  const sanitizedRunId = path.basename(runId)
  const sanitizedFilename = path.basename(filename)

  const filePath = path.join(PRIVATE_ARTIFACTS_DIR, sanitizedRunId, sanitizedFilename)
  try {
    const data = await fs.readFile(filePath)
    return data
  } catch {
    return null
  }
}
