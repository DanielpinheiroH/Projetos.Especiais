import { Storage } from "@google-cloud/storage";

if (!process.env.GCS_BUCKET) {
  throw new Error("Variável obrigatória ausente: GCS_BUCKET");
}

const rawCredentials = process.env.GCS_CREDENTIALS_JSON;
const credentials = rawCredentials
  ? JSON.parse(rawCredentials.replace(/\r?\n/g, "\n").trim())
  : null;

if (!credentials && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error(
    "Defina GCS_CREDENTIALS_JSON ou GOOGLE_APPLICATION_CREDENTIALS"
  );
}

const storage = credentials
  ? new Storage({
      projectId: credentials.project_id,
      credentials,
    })
  : new Storage();

const bucket = storage.bucket(process.env.GCS_BUCKET);

export { storage, bucket };
