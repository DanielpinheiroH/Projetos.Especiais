import { FastifyInstance } from "fastify";
import { db } from "../db/db.js";

type SaleItemInput = {
  quotaId: string;
  quantity: number;
  originalUnitPrice: number;
  discountPercentage: number;
  finalUnitPrice: number;
  finalTotalPrice: number;
};

type SaleBody = {
  projectId: string;
  saleDate: string;
  advertiserName: string;
  executiveName: string;
  notes?: string;
  items: SaleItemInput[];
};

export async function salesRoutes(app: FastifyInstance) {
  app.post("/sales", async (request, reply) => {
    const body = request.body as SaleBody;

    if (!body.projectId) {
      return reply.status(400).send({ message: "Projeto é obrigatório" });
    }

    if (!body.saleDate) {
      return reply.status(400).send({ message: "Data da venda é obrigatória" });
    }

    if (!body.advertiserName?.trim()) {
      return reply.status(400).send({ message: "Anunciante é obrigatório" });
    }

    if (!body.executiveName?.trim()) {
      return reply.status(400).send({ message: "Executivo é obrigatório" });
    }

    if (!body.items?.length) {
      return reply.status(400).send({ message: "Adicione ao menos um item" });
    }

    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const saleResult = await client.query(
        `
        INSERT INTO sales (
          project_id,
          advertiser_name,
          executive_name,
          sale_date,
          notes
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [
          body.projectId,
          body.advertiserName.trim(),
          body.executiveName.trim(),
          body.saleDate,
          body.notes || null,
        ]
      );

      const sale = saleResult.rows[0];

      for (const item of body.items) {
        if (!item.quotaId || Number(item.quantity) <= 0) {
          continue;
        }

        const quantity = Number(item.quantity || 0);
        const originalUnitPrice = Number(item.originalUnitPrice || 0);
        const discountPercentage = Number(item.discountPercentage || 0);
        const finalUnitPrice = Number(item.finalUnitPrice || 0);
        const finalTotalPrice = Number(item.finalTotalPrice || 0);

        const quotaResult = await client.query(
          `
          SELECT *
          FROM project_quotas
          WHERE id = $1
          FOR UPDATE
          `,
          [item.quotaId]
        );

        if (quotaResult.rows.length === 0) {
          throw new Error("Cota não encontrada");
        }

        const quota = quotaResult.rows[0];
        const available = Number(quota.quantity_available || 0);

        if (quantity > available) {
          throw new Error(`Quantidade indisponível para a cota ${quota.name}`);
        }

        await client.query(
          `
          INSERT INTO sale_items (
            sale_id,
            quota_id,
            quantity,
            original_unit_price,
            discount_percentage,
            final_unit_price,
            final_total_price
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
          [
            sale.id,
            item.quotaId,
            quantity,
            originalUnitPrice,
            discountPercentage,
            finalUnitPrice,
            finalTotalPrice,
          ]
        );

        await client.query(
          `
          UPDATE project_quotas
          SET
            quantity_sold = quantity_sold + $1,
            quantity_available = quantity_available - $1,
            updated_at = NOW()
          WHERE id = $2
          `,
          [quantity, item.quotaId]
        );
      }

      await client.query("COMMIT");

      const itemsResult = await db.query(
        `
        SELECT
          si.*,
          q.name AS quota_name
        FROM sale_items si
        LEFT JOIN project_quotas q ON q.id = si.quota_id
        WHERE si.sale_id = $1
        ORDER BY si.created_at ASC
        `,
        [sale.id]
      );

      return reply.status(201).send({
        ...sale,
        items: itemsResult.rows,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Erro ao criar venda:", error);

      return reply.status(500).send({
        message:
          error instanceof Error ? error.message : "Erro ao criar venda",
      });
    } finally {
      client.release();
    }
  });
}