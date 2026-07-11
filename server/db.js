import pkg from 'pg'
const { Pool } = pkg
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env') })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export default pool
