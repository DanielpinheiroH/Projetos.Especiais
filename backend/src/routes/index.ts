import { FastifyInstance } from "fastify";
import { projectRoutes } from "./projects.routes.js";
import { uploadRoutes } from "./uploads.routes.js";
import { salesRoutes } from "./sales.routes.js";

export async function routes(app: FastifyInstance) {
  app.get("/health", async () => {
    return {
      ok: true,
      message: "Backend rodando",
    };
  });

  await app.register(projectRoutes);
  await app.register(uploadRoutes);
  await app.register(salesRoutes);
}