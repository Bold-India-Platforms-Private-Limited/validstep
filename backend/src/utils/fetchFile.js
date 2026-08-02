'use strict';

/**
 * Fetches a remote file (R2, local /uploads, etc.) into a Buffer — used to attach the
 * certificate file to outgoing emails via nodemailer, which needs the bytes up front
 * rather than a URL.
 */
async function fetchFileBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch file (${res.status}): ${url}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

module.exports = { fetchFileBuffer };
