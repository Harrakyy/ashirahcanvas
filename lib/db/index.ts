import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/ashirah'

// Singleton pool for Next.js hot-reload prevention
declare global {
  // eslint-disable-next-line no-var
  var __db_pool: Pool | undefined
}

let pool: Pool

if (process.env.NODE_ENV === 'production') {
  pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  })
} else {
  if (!globalThis.__db_pool) {
    globalThis.__db_pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  }
  pool = globalThis.__db_pool
}

export const db = drizzle(pool, { schema })
export { pool, schema }
export default db
