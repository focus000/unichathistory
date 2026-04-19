import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Case-insensitive recursive search for a file with exact basename.
 * Returns absolute path or null. Depth-limited to avoid huge scans.
 */
export function findFile(root: string, name: string, maxDepth = 5): string | null {
  const target = name.toLowerCase()
  const walk = (dir: string, depth: number): string | null => {
    if (depth > maxDepth) return null
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      return null
    }
    for (const entry of entries) {
      const full = join(dir, entry)
      let st
      try {
        st = statSync(full)
      } catch {
        continue
      }
      if (st.isFile() && entry.toLowerCase() === target) return full
    }
    for (const entry of entries) {
      const full = join(dir, entry)
      let st
      try {
        st = statSync(full)
      } catch {
        continue
      }
      if (st.isDirectory()) {
        const found = walk(full, depth + 1)
        if (found) return found
      }
    }
    return null
  }
  return walk(root, 0)
}

export function findDir(root: string, name: string, maxDepth = 5): string | null {
  const target = name.toLowerCase()
  const walk = (dir: string, depth: number): string | null => {
    if (depth > maxDepth) return null
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      return null
    }
    for (const entry of entries) {
      const full = join(dir, entry)
      let st
      try {
        st = statSync(full)
      } catch {
        continue
      }
      if (st.isDirectory() && entry.toLowerCase() === target) return full
    }
    for (const entry of entries) {
      const full = join(dir, entry)
      let st
      try {
        st = statSync(full)
      } catch {
        continue
      }
      if (st.isDirectory()) {
        const found = walk(full, depth + 1)
        if (found) return found
      }
    }
    return null
  }
  return walk(root, 0)
}
