import dotenv from "dotenv";
dotenv.config();

import { buildApp } from "./app.js";
import { testDbConnection } from "./db/db.js";
import { initializeDatabase } from "./db/schema.js";

async function start() {
  try {
    await testDbConnection();
    await initializeDatabase();

    const app = await buildApp();
    const port = Number(process.env.PORT || 3333);

    await app.listen({
      port,
      host: "0.0.0.0",
    });

    console.log(`Servidor rodando em http://localhost:${port}`);
  } catch (error) {
    console.error("Erro ao iniciar backend:", error);
    process.exit(1);
  }
}

start();