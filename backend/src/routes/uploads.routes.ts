import { FastifyInstance } from "fastify";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";
import cloudinary from "../config/cloudinary.js";

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
            publicId: string;
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

          const tempDir = path.join(process.cwd(), "tmp");

          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }

          const tempFilePath = path.join(tempDir, safeName);

          await pipeline(part.file, fs.createWriteStream(tempFilePath));

          const stats = fs.statSync(tempFilePath);
          if (!stats.size || stats.size <= 0) {
            fs.unlinkSync(tempFilePath);

            return reply.status(400).send({
              message: "Arquivo salvo inválido ou vazio.",
            });
          }

          const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
            resource_type: "auto",
            folder: `projetos-especiais/${folder}`,
            use_filename: false,
            unique_filename: true,
          });

          fs.unlinkSync(tempFilePath);

          responseData = {
            url: uploadResult.secure_url,
            fileName: part.filename,
            storedName: safeName,
            folder,
            mimeType: part.mimetype,
            publicId: uploadResult.public_id,
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