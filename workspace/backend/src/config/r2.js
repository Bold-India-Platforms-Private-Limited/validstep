import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL;
// Namespaced so this app's objects never collide with other apps sharing the same bucket.
const PREFIX = "pm-app";

export async function uploadBase64Image(base64DataUrl, keySuffix) {
  const match = base64DataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image data URL");
  const [, mimeType, data] = match;
  const buffer = Buffer.from(data, "base64");
  const ext = mimeType.split("/")[1] || "jpg";
  const key = `${PREFIX}/${keySuffix}.${ext}`;

  await r2.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: mimeType })
  );

  return `${PUBLIC_URL}/${key}`;
}

export async function deleteObjectByUrl(url) {
  if (!url?.startsWith(PUBLIC_URL)) return;
  const key = url.slice(PUBLIC_URL.length + 1);
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
