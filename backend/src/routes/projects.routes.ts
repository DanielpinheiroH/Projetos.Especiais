import { FastifyInstance } from "fastify";
import fs from "node:fs";
import path from "node:path";
import { db } from "../db/db.js";

type ProjectQuotaInput = {
  name: string;
  description?: string;
  type: string;
  unitPrice: number;
  quantity: number;
};

type ProjectBody = {
  name: string;
  type: string;
  description?: string;
  expiresAt?: string | null;
  hasNoExpiration?: boolean;
  status?: string;
  coverImageUrl?: string | null;
  coverImageName?: string | null;
  pdfUrl?: string | null;
  pdfName?: string | null;
  quotas?: ProjectQuotaInput[];
};

function normalizeStatus(body: ProjectBody) {
  if (body.status) return body.status;
  if (body.hasNoExpiration || body.type === "ATEMPORAL") return "ATEMPORAL";
  return "ATIVO";
}

function sanitizeDownloadName(fileName: string) {
  return fileName.replace(/[\\/:*?"<>|]/g, "_");
}

export async function projectRoutes(app: FastifyInstance) {
  app.get("/projects", async () => {
    const result = await db.query(`
      SELECT *
      FROM projects
      ORDER BY created_at DESC
    `);

    return result.rows;
  });

  app.get("/projects/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const projectResult = await db.query(
      `
      SELECT *
      FROM projects
      WHERE id = $1
      `,
      [id]
    );

    if (projectResult.rows.length === 0) {
      return reply.status(404).send({ message: "Projeto não encontrado" });
    }

    const quotasResult = await db.query(
      `
      SELECT *
      FROM project_quotas
      WHERE project_id = $1
      ORDER BY created_at ASC
      `,
      [id]
    );

    const salesResult = await db.query(
      `
      SELECT
        s.*,
        si.quota_id,
        si.quantity,
        si.original_unit_price,
        si.discount_percentage,
        si.final_unit_price,
        si.final_total_price,
        q.name AS quota_name
      FROM sales s
      LEFT JOIN sale_items si ON si.sale_id = s.id
      LEFT JOIN project_quotas q ON q.id = si.quota_id
      WHERE s.project_id = $1
      ORDER BY s.sale_date DESC
      `,
      [id]
    );

    return {
      ...projectResult.rows[0],
      quotas: quotasResult.rows,
      sales: salesResult.rows,
    };
  });

  app.get("/projects/:id/download-pdf", async (request, reply) => {
    const { id } = request.params as { id: string };

    const result = await db.query(
      `
      SELECT pdf_url, pdf_name
      FROM projects
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ message: "Projeto não encontrado" });
    }

    const project = result.rows[0];

    if (!project.pdf_url) {
      return reply.status(404).send({ message: "PDF não vinculado ao projeto" });
    }

    const fileNameFromUrl = String(project.pdf_url).split("/").pop();

    if (!fileNameFromUrl) {
      return reply.status(404).send({ message: "Arquivo PDF inválido" });
    }

    const pdfPathPrimary = path.join(
      process.cwd(),
      "uploads",
      "pdfs",
      fileNameFromUrl
    );
    const pdfPathFallback = path.join(
      process.cwd(),
      "uploads",
      "misc",
      fileNameFromUrl
    );

    const finalPath = fs.existsSync(pdfPathPrimary)
      ? pdfPathPrimary
      : pdfPathFallback;

    if (!fs.existsSync(finalPath)) {
      return reply.status(404).send({ message: "Arquivo PDF não encontrado" });
    }

    const downloadName = sanitizeDownloadName(
      project.pdf_name || fileNameFromUrl || "arquivo.pdf"
    );

    reply.header("Content-Type", "application/pdf");
    reply.header(
      "Content-Disposition",
      `attachment; filename="${downloadName}"`
    );
    reply.header("Cache-Control", "no-store");

    return reply.send(fs.createReadStream(finalPath));
  });

  app.post("/projects", async (request, reply) => {
    const body = request.body as ProjectBody;

    if (!body.name || !body.type) {
      return reply.status(400).send({
        message: "Nome e tipo do projeto são obrigatórios",
      });
    }

    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const projectResult = await client.query(
        `
        INSERT INTO projects (
          name,
          type,
          description,
          expires_at,
          has_no_expiration,
          status,
          cover_image_url,
          cover_image_name,
          pdf_url,
          pdf_name
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING *
        `,
        [
          body.name,
          body.type,
          body.description || null,
          body.expiresAt || null,
          body.hasNoExpiration ?? false,
          normalizeStatus(body),
          body.coverImageUrl || null,
          body.coverImageName || null,
          body.pdfUrl || null,
          body.pdfName || null,
        ]
      );

      const project = projectResult.rows[0];

      if (body.quotas?.length) {
        for (const quota of body.quotas) {
          if (!quota.name || !quota.type) continue;

          const quantityTotal = Number(quota.quantity || 0);
          const unitPrice = Number(quota.unitPrice || 0);

          await client.query(
            `
            INSERT INTO project_quotas (
              project_id,
              name,
              description,
              quota_type,
              unit_price,
              quantity_total,
              quantity_sold,
              quantity_available
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            `,
            [
              project.id,
              quota.name,
              quota.description || null,
              quota.type,
              unitPrice,
              quantityTotal,
              0,
              quantityTotal,
            ]
          );
        }
      }

      await client.query("COMMIT");

      const quotasResult = await db.query(
        `
        SELECT *
        FROM project_quotas
        WHERE project_id = $1
        ORDER BY created_at ASC
        `,
        [project.id]
      );

      return reply.status(201).send({
        ...project,
        quotas: quotasResult.rows,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Erro ao criar projeto:", error);
      return reply.status(500).send({ message: "Erro ao criar projeto" });
    } finally {
      client.release();
    }
  });

  app.put("/projects/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as ProjectBody;

    if (!body.name || !body.type) {
      return reply.status(400).send({
        message: "Nome e tipo do projeto são obrigatórios",
      });
    }

    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const projectResult = await client.query(
        `
        UPDATE projects
        SET
          name = $1,
          type = $2,
          description = $3,
          expires_at = $4,
          has_no_expiration = $5,
          status = $6,
          cover_image_url = $7,
          cover_image_name = $8,
          pdf_url = $9,
          pdf_name = $10,
          updated_at = NOW()
        WHERE id = $11
        RETURNING *
        `,
        [
          body.name,
          body.type,
          body.description || null,
          body.expiresAt || null,
          body.hasNoExpiration ?? false,
          normalizeStatus(body),
          body.coverImageUrl || null,
          body.coverImageName || null,
          body.pdfUrl || null,
          body.pdfName || null,
          id,
        ]
      );

      if (projectResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return reply.status(404).send({ message: "Projeto não encontrado" });
      }

      await client.query(
        `
        DELETE FROM project_quotas
        WHERE project_id = $1
        `,
        [id]
      );

      if (body.quotas?.length) {
        for (const quota of body.quotas) {
          if (!quota.name || !quota.type) continue;

          const quantityTotal = Number(quota.quantity || 0);
          const unitPrice = Number(quota.unitPrice || 0);

          await client.query(
            `
            INSERT INTO project_quotas (
              project_id,
              name,
              description,
              quota_type,
              unit_price,
              quantity_total,
              quantity_sold,
              quantity_available
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            `,
            [
              id,
              quota.name,
              quota.description || null,
              quota.type,
              unitPrice,
              quantityTotal,
              0,
              quantityTotal,
            ]
          );
        }
      }

      await client.query("COMMIT");

      const quotasResult = await db.query(
        `
        SELECT *
        FROM project_quotas
        WHERE project_id = $1
        ORDER BY created_at ASC
        `,
        [id]
      );

      return {
        ...projectResult.rows[0],
        quotas: quotasResult.rows,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Erro ao atualizar projeto:", error);
      return reply.status(500).send({ message: "Erro ao atualizar projeto" });
    } finally {
      client.release();
    }
  });

  app.patch("/projects/:id/deactivate", async (request, reply) => {
    const { id } = request.params as { id: string };

    const result = await db.query(
      `
      UPDATE projects
      SET status = 'INATIVO', updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ message: "Projeto não encontrado" });
    }

    return result.rows[0];
  });

  app.delete("/projects/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    await db.query(
      `
      DELETE FROM projects
      WHERE id = $1
      `,
      [id]
    );

    return reply.status(204).send();
  });
}