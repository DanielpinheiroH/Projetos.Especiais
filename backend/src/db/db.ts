import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const db = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "postgres",
  password: String(process.env.DB_PASSWORD || "postgres"),
  database: process.env.DB_NAME || "projetos_especiais",
});

export async function testDbConnection() {
  const client = await db.connect();

  try {
    const result = await client.query("SELECT NOW()");
    console.log("Banco conectado com sucesso:", result.rows[0]);
  } finally {
    client.release();
  }
}