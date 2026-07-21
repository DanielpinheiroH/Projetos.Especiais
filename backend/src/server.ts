import dotenv from "dotenv";
dotenv.config();

import { buildApp } from "./app.js";
import { db, testDbConnection } from "./db/db.js";
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

    let shuttingDown = false;
    const shutdown = async (signal: string) => {
      if (shuttingDown) return;
      shuttingDown = true;

      app.log.info({ signal }, "Encerrando servidor");
      await app.close();
      await db.end();
      process.exit(0);
    };

    process.once("SIGTERM", () => void shutdown("SIGTERM"));
    process.once("SIGINT", () => void shutdown("SIGINT"));

    console.log(`Servidor rodando em http://localhost:${port}`);
  } catch (error) {
    console.error("Erro ao iniciar backend:", error);
    process.exit(1);
  }
}

start();
