import { FastifyInstance } from "fastify";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { bucket } from "../config/googleStorage.js";

function getMimeType(type: string, originalMimeType?: string) {
  if (originalMimeType) return originalMimeType;
  if (type === "pdf") return "application/pdf";
  return "application/octet-stream";
}

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

          const objectPath = `projetos-especiais/${folder}/${safeName}`;

          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(chunk);
          }

          const fileBuffer = Buffer.concat(chunks);

          if (!fileBuffer.length) {
            return reply.status(400).send({
              message: "Arquivo inválido ou vazio.",
            });
          }

          const file = bucket.file(objectPath);

          await file.save(fileBuffer, {
            metadata: {
              contentType: getMimeType(type, part.mimetype),
            },
            resumable: false,
            validation: false,
          });

          responseData = {
            url: `https://storage.googleapis.com/${process.env.GCS_BUCKET}/${objectPath}`,
            fileName: part.filename,
            storedName: safeName,
            folder,
            mimeType: part.mimetype || getMimeType(type),
          };
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