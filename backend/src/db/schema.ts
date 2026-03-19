import { db } from "./db.js";

export async function initializeDatabase() {
  await db.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      expires_at DATE,
      has_no_expiration BOOLEAN DEFAULT FALSE,
      status TEXT NOT NULL DEFAULT 'ATIVO',
      cover_image_url TEXT,
      cover_image_name TEXT,
      pdf_url TEXT,
      pdf_name TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS project_quotas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      quota_type TEXT NOT NULL,
      unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
      quantity_total INT NOT NULL DEFAULT 0,
      quantity_sold INT NOT NULL DEFAULT 0,
      quantity_available INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS sales (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      advertiser_name TEXT NOT NULL,
      executive_name TEXT NOT NULL,
      sale_date DATE NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      quota_id UUID NOT NULL REFERENCES project_quotas(id) ON DELETE CASCADE,
      quantity INT NOT NULL,
      original_unit_price NUMERIC(12,2) NOT NULL,
      discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
      final_unit_price NUMERIC(12,2) NOT NULL,
      final_total_price NUMERIC(12,2) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log("Tabelas verificadas/criadas com sucesso.");
}