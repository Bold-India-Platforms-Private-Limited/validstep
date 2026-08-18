import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // STARTTLS on 587
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// Never throws — a failed email should never break the request that triggered it
// (a bulk invite of 500 interns shouldn't 500 because one inbox bounced).
export async function sendMail({ to, subject, html }) {
  try {
    await transporter.sendMail({
      from: `"Workspace" <${process.env.SENDER_EMAIL}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error(`sendMail failed for ${to}:`, err.message);
    return false;
  }
}

// Sends a batch with limited concurrency so we don't trip SES sending-rate limits
// when inviting hundreds/thousands of interns at once.
export async function sendMailBatch(messages, { concurrency = 5 } = {}) {
  const results = new Array(messages.length);
  let cursor = 0;

  async function worker() {
    while (cursor < messages.length) {
      const i = cursor++;
      results[i] = await sendMail(messages[i]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, messages.length) }, worker));
  return results;
}
