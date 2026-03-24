import { FastifyInstance } from "fastify";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";
import { bucket } from "../config/googleStorage.js";

function getFolder(type: string) {
  if (type === "cover") return "covers";
  if (type === "pdf") return "pdfs";
  return "misc";
}

function getMimeType(type: string, originalMimeType?: string) {
  if (originalMimeType) return originalMimeType;
  if (type === "pdf") return "application/pdf";
  return "application/octet-stream";
}

export async function uploadRoutes(app: FastifyInstance) {
  app.post("/uploads", async (request, reply) => {
    let tempFilePath = "";

    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ message: "Arquivo não enviado" });
      }

      const typeField = data.fields?.type;
      const type =
        typeField && "value" in typeField
          ? String(typeField.value || "misc").toLowerCase()
          : "misc";

      const folder = getFolder(type);
      const ext = path.extname(data.filename || "");
      const safeName = `${randomUUID()}${ext}`;
      const objectPath = `projetos-especiais/${folder}/${safeName}`;

      const tempDir = path.join(os.tmpdir(), "projetos-especiais-upload");
      await fs.promises.mkdir(tempDir, { recursive: true });

      tempFilePath = path.join(tempDir, safeName);

      await pipeline(data.file, fs.createWriteStream(tempFilePath));

      const stats = await fs.promises.stat(tempFilePath);
      if (!stats.size) {
        return reply.status(400).send({
          message: "Arquivo inválido ou vazio.",
        });
      }

      await bucket.upload(tempFilePath, {
        destination: objectPath,
        metadata: {
          contentType: getMimeType(type, data.mimetype),
        },
        resumable: false,
      });

      const url = `https://storage.googleapis.com/${process.env.GCS_BUCKET}/${objectPath}`;

      return reply.send({
        url,
        fileName: data.filename,
        storedName: safeName,
        folder,
        mimeType: data.mimetype || getMimeType(type),
      });
    } catch (error) {
      console.error("Erro no upload:", error);

      return reply.status(500).send({
        message: error instanceof Error ? error.message : "Erro no upload",
      });
    } finally {
      if (tempFilePath) {
        try {
          await fs.promises.unlink(tempFilePath);
        } catch {}
      }
    }
  });
}