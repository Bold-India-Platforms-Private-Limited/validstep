'use strict';

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const env = require('../config/env');

let client = null;

function getClient() {
  if (!client) {
    const required = [
      'CLOUDFLARE_R2_ACCOUNT_ID',
      'CLOUDFLARE_R2_ACCESS_KEY_ID',
      'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
      'CLOUDFLARE_R2_BUCKET_NAME',
      'CLOUDFLARE_R2_PUBLIC_URL',
    ];
    const missing = required.filter((key) => !env[key]);
    if (missing.length) {
      throw new Error(`R2 storage not configured, missing: ${missing.join(', ')}`);
    }
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

/**
 * Upload a buffer to the R2 bucket and return its public URL (served via the
 * CLOUDFLARE_R2_PUBLIC_URL custom domain, not the r2.cloudflarestorage.com endpoint).
 */
async function uploadBufferToR2(buffer, key, contentType) {
  await getClient().send(new PutObjectCommand({
    Bucket: env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return `${env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
}

module.exports = { uploadBufferToR2 };
