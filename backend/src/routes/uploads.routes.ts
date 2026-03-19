import { FastifyInstance } from "fastify";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";

export async function uploadRoutes(app: FastifyInstance) {
  app.post("/uploads", async (request, reply) => {
    try {
      const parts = request.parts();

      let type = "misc";
      let responseData:
        | {
            url: string;
            fileName: string;
            storedName: string;
            folder: string;
            mimeType: string;
          }
        | null = null;

      for await (const part of parts) {
        if (part.type === "field" && part.fieldname === "type") {
          type = String(part.value || "misc").toLowerCase();
          continue;
        }

        if (part.type === "file" && part.fieldname === "file") {
          const ext = path.extname(part.filename || "");
          const safeName = `${randomUUID()}${ext}`;

          let folder = "misc";
          if (type === "cover") folder = "covers";
          if (type === "pdf") folder = "pdfs";

          const uploadDir = path.join(process.cwd(), "uploads", folder);

          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }

          const filePath = path.join(uploadDir, safeName);

          await pipeline(part.file, fs.createWriteStream(filePath));

          const stats = fs.statSync(filePath);
          if (!stats.size || stats.size <= 0) {
            fs.unlinkSync(filePath);

            return reply.status(400).send({
              message: "Arquivo salvo inválido ou vazio.",
            });
          }

          const fileUrl = `http://localhost:3333/uploads/${folder}/${safeName}`;

          responseData = {
            url: fileUrl,
            fileName: part.filename,
            storedName: safeName,
            folder,
            mimeType: part.mimetype,
          };

          break;
        }
      }

      if (!responseData) {
        return reply.status(400).send({ message: "Arquivo não enviado" });
      }

      return reply.send(responseData);
    } catch (error) {
      console.error("Erro no upload:", error);

      return reply.status(500).send({
        message: error instanceof Error ? error.message : "Erro no upload",
      });
    }
  });
}