import { config } from "dotenv";
import crypto from "crypto";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import type { Readable } from "stream";

config({ path: ".env.local" });

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY =
  process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const R2_PUBLIC_BUCKET =
  process.env.R2_BUCKET || process.env.CLOUDFLARE_R2_BUCKET || "statpedia-raw";

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.warn("[r2] Missing R2 credentials; raw uploads will be skipped.");
}

export const r2 = new S3Client({
  region: "auto",
  endpoint: R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined,
  credentials:
    R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY
      ? {
          accessKeyId: R2_ACCESS_KEY_ID,
          secretAccessKey: R2_SECRET_ACCESS_KEY,
        }
      : undefined,
});

export async function uploadJsonToR2(opts: {
  bucket?: string;
  key: string;
  body: any;
  contentType?: string;
}) {
  const bucket = opts.bucket || R2_PUBLIC_BUCKET;
  const bodyStr = typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body);
  const hash = crypto.createHash("sha256").update(bodyStr).digest("hex");
  await r2.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: opts.key,
      Body: bodyStr,
      ContentType: opts.contentType || "application/json",
    }),
  );
  return {
    bucket,
    key: opts.key,
    size: Buffer.byteLength(bodyStr),
    contentType: opts.contentType || "application/json",
    checksum: hash,
  };
}

export async function headObject(opts: { bucket?: string; key: string }) {
  const bucket = opts.bucket || R2_PUBLIC_BUCKET;
  try {
    return await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: opts.key }));
  } catch (e) {
    return null;
  }
}

async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  return await new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

export async function fetchJsonFromR2(opts: { bucket?: string; key: string }): Promise<any | null> {
  const bucket = opts.bucket || R2_PUBLIC_BUCKET;
  try {
    const obj = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: opts.key }));
    const body = obj.Body as Readable | undefined;
    if (!body) return null;
    const text = await streamToString(body);
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}
