import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não definida");
}

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

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