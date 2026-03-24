import { Storage } from "@google-cloud/storage";

if (!process.env.GCS_CREDENTIALS_JSON) {
  throw new Error("Variável obrigatória ausente: GCS_CREDENTIALS_JSON");
}

if (!process.env.GCS_BUCKET) {
  throw new Error("Variável obrigatória ausente: GCS_BUCKET");
}

const raw = process.env.GCS_CREDENTIALS_JSON!;

const credentials = JSON.parse(
  raw
    .replace(/\r?\n/g, "\n")
    .trim()
);

const storage = new Storage({
  projectId: credentials.project_id,
  credentials,
});

const bucket = storage.bucket(process.env.GCS_BUCKET);

export { storage, bucket };