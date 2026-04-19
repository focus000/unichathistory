import { cp, mkdir } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { join } from 'node:path'
import type { Platform } from '@shared/types'

export interface ArchiveResult {
  batchId: string
  archivePath: string
}

/**
 * Recursively copy the user-chosen folder into
 *   <storageRoot>/raw/<platform>/<YYYYMMDD-HHMMSS>-<shortHex>/
 *
 * The original folder is not touched.
 */
export async function archiveFolder(
  storageRoot: string,
  platform: Platform,
  sourceFolder: string,
): Promise<ArchiveResult> {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const batchId = `${stamp}-${randomBytes(3).toString('hex')}`
  const archivePath = join(storageRoot, 'raw', platform, batchId)
  await mkdir(archivePath, { recursive: true })
  await cp(sourceFolder, archivePath, { recursive: true, errorOnExist: false })
  return { batchId, archivePath }
}
