import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import pg from 'pg'

export async function startEvaluationPostgres() {
  const port = Number(process.env.EVAL_DB_PORT || 54329)
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid EVAL_DB_PORT')
  const database = await PGlite.create(process.env.EVAL_DB_DIR || './pglite-data')
  const server = new PGLiteSocketServer({ db: database, port, host: '127.0.0.1', maxConnections: 1 })
  await server.start()
  const connectionString = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`
  return {
    connectionString,
    getPgClient: () => new pg.Client({ connectionString }),
    stop: async () => { await server.stop(); await database.close() },
  }
}
