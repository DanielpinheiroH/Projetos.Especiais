import { Storage } from "@google-cloud/storage";

const requiredEnv = [
  "GCS_PROJECT_ID",
  "GCS_CLIENT_EMAIL",
  "GCS_PRIVATE_KEY",
  "GCS_BUCKET",
] as const;

for (const envName of requiredEnv) {
  if (!process.env[envName]) {
    throw new Error(`Variável obrigatória ausente: ${envName}`);
  }
}

const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  credentials: {
    client_email: process.env.GCS_CLIENT_EMAIL,
    private_key: process.env.GCS_PRIVATE_KEY!.replace(/\\n/g, "\n"),
  },
});

const bucket = storage.bucket(process.env.GCS_BUCKET!);

export { storage, bucket };