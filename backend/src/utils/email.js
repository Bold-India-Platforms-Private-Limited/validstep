'use strict';

const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  } else {
    // Dev fallback: log to console
    transporter = {
      sendMail: async (options) => {
        console.log('\n📧 [EMAIL - DEV CONSOLE LOG]');
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log('--- HTML (first 400 chars) ---');
        console.log((options.html || '').slice(0, 400));
        console.log('------------------------------\n');
        return { messageId: 'dev-' + Date.now() };
      },
    };
  }
  return transporter;
}

const FROM_NAME = process.env.SMTP_FROM_NAME || 'ListedIndia Verify';
const FROM_EMAIL = process.env.SMTP_USER || 'noreply@listedindia.com';

async function sendEmail({ to, subject, html }) {
  try {
    const t = getTransporter();
    const info = await t.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    });
    return info;
  } catch (err) {
    console.error('[Email] Failed to send:', err.message);
    // Never crash the main flow on email failure
  }
}

// ─── Templates ───────────────────────────────────────────────────────────────

function baseLayout(content) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { margin:0; padding:0; background:#f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .wrapper { max-width:600px; margin:32px auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.08); }
  .header { background:linear-gradient(135deg,#4F46E5,#7C3AED); padding:32px 40px; text-align:center; }
  .header h1 { margin:0; color:#fff; font-size:22px; font-weight:700; }
  .header p { margin:6px 0 0; color:rgba(255,255,255,0.8); font-size:13px; }
  .body { padding:32px 40px; }
  .btn { display:inline-block; background:#4F46E5; color:#fff; text-decoration:none; padding:13px 28px; border-radius:8px; font-weight:600; font-size:15px; margin:8px 4px; }
  .btn-outline { background:#fff; color:#4F46E5; border:2px solid #4F46E5; }
  .info-box { background:#f8f9ff; border:1px solid #e0e3ff; border-radius:10px; padding:20px; margin:20px 0; }
  .info-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eee; font-size:14px; }
  .info-row:last-child { border-bottom:none; }
  .info-row .label { color:#64748b; }
  .info-row .value { color:#1e293b; font-weight:600; }
  .footer { background:#f8fafc; border-top:1px solid #e2e8f0; padding:20px 40px; text-align:center; font-size:12px; color:#94a3b8; }
  .badge-success { display:inline-block; background:#dcfce7; color:#166534; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:600; }
  .badge-warning { display:inline-block; background:#fef9c3; color:#854d0e; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:600; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>🎓 ListedIndia Verify</h1>
    <p>Digital Certificate Platform</p>
  </div>
  <div class="body">${content}</div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} ListedIndia. All rights reserved.</p>
    <p>This email was sent automatically. Please do not reply.</p>
  </div>
</div>
</body>
</html>`;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  });
}

/**
 * Send certificate issued email to user
 */
async function sendCertificateIssuedEmail({ userName, userEmail, batchName, companyName, programType, role, startDate, endDate, certificateSerial, verificationHash, verificationUrl, downloadUrl }) {
  const certType = programType === 'INTERNSHIP' ? 'Internship / Fellowship Certificate' : programType === 'COURSE' ? 'Certificate of Completion' : programType === 'HACKATHON' ? 'Certificate of Achievement' : 'Certificate of Participation';

  const html = baseLayout(`
    <h2 style="margin:0 0 8px;color:#1e293b;">🎉 Your Certificate is Ready!</h2>
    <p style="color:#64748b;margin:0 0 24px;">Hi <strong>${userName}</strong>, your <strong>${certType}</strong> from <strong>${companyName}</strong> has been issued and is ready for download.</p>

    <div class="info-box">
      <div class="info-row"><span class="label">Certificate Type</span><span class="value">${certType}</span></div>
      <div class="info-row"><span class="label">Program / Batch</span><span class="value">${batchName}</span></div>
      ${role ? `<div class="info-row"><span class="label">Role</span><span class="value">${role}</span></div>` : ''}
      <div class="info-row"><span class="label">Issued By</span><span class="value">${companyName}</span></div>
      <div class="info-row"><span class="label">Duration</span><span class="value">${formatDate(startDate)} – ${formatDate(endDate)}</span></div>
      <div class="info-row"><span class="label">Certificate Serial</span><span class="value" style="font-family:monospace;">${certificateSerial}</span></div>
    </div>

    <div style="text-align:center;margin:28px 0;">
      <a href="${verificationUrl}" class="btn">🔍 View & Verify Certificate</a>
      ${downloadUrl ? `<a href="${downloadUrl}" class="btn btn-outline">⬇ Download PDF</a>` : ''}
    </div>

    <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:14px 18px;margin:20px 0;font-size:13px;color:#854d0e;">
      <strong>🔗 Your shareable verification link:</strong><br>
      <a href="${verificationUrl}" style="color:#4F46E5;word-break:break-all;">${verificationUrl}</a>
    </div>

    <p style="font-size:13px;color:#64748b;">Anyone can verify the authenticity of your certificate by visiting the link above. It is permanently stored on our platform.</p>
  `);

  return sendEmail({
    to: userEmail,
    subject: `🎓 Your ${certType} from ${companyName} is ready!`,
    html,
  });
}

/**
 * Send payment confirmation email
 */
async function sendPaymentConfirmationEmail({ userName, userEmail, batchName, companyName, amount, currency, certificateSerial, txnId, paidAt, orderId }) {
  const html = baseLayout(`
    <h2 style="margin:0 0 8px;color:#1e293b;">✅ Payment Confirmed</h2>
    <p style="color:#64748b;margin:0 0 24px;">Hi <strong>${userName}</strong>, your payment has been received successfully. Your certificate will be issued once the program concludes.</p>

    <div class="info-box">
      <div class="info-row"><span class="label">Order ID</span><span class="value" style="font-family:monospace;font-size:12px;">${orderId}</span></div>
      <div class="info-row"><span class="label">Batch</span><span class="value">${batchName}</span></div>
      <div class="info-row"><span class="label">Company</span><span class="value">${companyName}</span></div>
      <div class="info-row"><span class="label">Certificate Serial</span><span class="value" style="font-family:monospace;">${certificateSerial}</span></div>
      <div class="info-row"><span class="label">Amount Paid</span><span class="value" style="color:#16a34a;">₹${Number(amount).toLocaleString('en-IN')}</span></div>
      <div class="info-row"><span class="label">Payment Date</span><span class="value">${formatDateTime(paidAt)}</span></div>
      <div class="info-row"><span class="label">Transaction ID</span><span class="value" style="font-family:monospace;font-size:12px;">${txnId || '—'}</span></div>
    </div>

    <div style="text-align:center;margin:28px 0;">
      <a href="${env.FRONTEND_URL}/dashboard" class="btn">Go to My Dashboard</a>
    </div>

    <p style="font-size:13px;color:#64748b;">Keep this email as your payment receipt. You can also download your invoice from the dashboard.</p>
  `);

  return sendEmail({
    to: userEmail,
    subject: `✅ Payment Confirmed – ${batchName} Certificate`,
    html,
  });
}

module.exports = {
  sendEmail,
  sendCertificateIssuedEmail,
  sendPaymentConfirmationEmail,
};
