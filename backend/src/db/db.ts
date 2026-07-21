import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
const databaseSsl = process.env.DATABASE_SSL !== "false";

if (!databaseUrl && !process.env.DB_HOST) {
  throw new Error("Defina DATABASE_URL ou as variáveis DB_HOST/DB_USER/DB_PASSWORD/DB_NAME");
}

export const db = new Pool(
  databaseUrl
    ? {
        connectionString: databaseUrl,
        ssl: databaseSsl ? { rejectUnauthorized: false } : false,
      }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 5432),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: databaseSsl ? { rejectUnauthorized: false } : false,
      }
);

export async function testDbConnection() {
  const client = await db.connect();

  try {
    const result = await client.query("SELECT NOW()");
    console.log("Banco conectado com sucesso:", result.rows[0]);
  } catch (error) {
    console.error("Erro ao conectar no banco:", error);
    throw error;
  } finally {
    client.release();
  }
}
