import pg from "pg"

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function query<T extends pg.QueryResultRow = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params)
}

export default pool
