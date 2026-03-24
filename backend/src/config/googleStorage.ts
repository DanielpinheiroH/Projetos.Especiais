import { Storage } from "@google-cloud/storage";

if (!process.env.GCS_CREDENTIALS_JSON) {
  throw new Error("Variável obrigatória ausente: GCS_CREDENTIALS_JSON");
}

if (!process.env.GCS_BUCKET) {
  throw new Error("Variável obrigatória ausente: GCS_BUCKET");
}

const credentials = JSON.parse(process.env.GCS_CREDENTIALS_JSON);

const storage = new Storage({
  projectId: credentials.project_id,
  credentials,
});

const bucket = storage.bucket(process.env.GCS_BUCKET);

export { storage, bucket };