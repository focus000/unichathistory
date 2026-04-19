import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { SCHEMA_SQL } from './schema'

let db: Database.Database | null = null

export function openDb(storagePath: string): Database.Database {
  mkdirSync(storagePath, { recursive: true })
  const dbPath = join(storagePath, 'unichat.db')
  if (db) {
    db.close()
    db = null
  }
  const instance = new Database(dbPath)
  instance.exec(SCHEMA_SQL)
  db = instance
  return instance
}

export function getDb(): Database.Database {
  if (!db) throw new Error('DB not initialized. Call openDb() first.')
  return db
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
