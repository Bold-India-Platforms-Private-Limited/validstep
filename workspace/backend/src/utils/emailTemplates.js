const wrap = (bodyHtml) => `
<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#171717">
  <div style="font-weight:700;font-size:18px;margin-bottom:24px;color:#4f46e5">Workspace</div>
  ${bodyHtml}
  <p style="font-size:12px;color:#a3a3a3;margin-top:32px">If you didn't expect this email, you can ignore it.</p>
</div>`;

const credentialsBlock = (email, password) => `
<div style="background:#f5f5f5;border-radius:12px;padding:16px 20px;margin:20px 0">
  <p style="margin:0 0 8px;font-size:13px;color:#737373">Email</p>
  <p style="margin:0 0 16px;font-size:14px;font-weight:600">${email}</p>
  <p style="margin:0 0 8px;font-size:13px;color:#737373">Password</p>
  <p style="margin:0;font-size:14px;font-weight:600;font-family:monospace">${password}</p>
</div>`;

export function welcomeCredentialsEmail({ name, email, password, workspaceName, loginUrl }) {
  return {
    subject: `You've been added to ${workspaceName}`,
    html: wrap(`
      <p>Hi ${name},</p>
      <p>You've been added to <strong>${workspaceName}</strong>. Here are your login details:</p>
      ${credentialsBlock(email, password)}
      <a href="${loginUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 20px;border-radius:10px;font-size:14px;font-weight:600">Log in</a>
      <p style="font-size:13px;color:#737373;margin-top:20px">We recommend changing your password after your first login.</p>
    `),
  };
}

export function notificationEmail({ title, subtitle, buttonName, buttonUrl, loginUrl }) {
  return {
    subject: title,
    html: wrap(`
      <p style="font-size:16px;font-weight:600;margin:0 0 8px">${title}</p>
      ${subtitle ? `<p style="color:#525252;margin:0 0 20px">${subtitle}</p>` : ""}
      <a href="${buttonUrl || loginUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 20px;border-radius:10px;font-size:14px;font-weight:600">${buttonName || "Open Workspace"}</a>
    `),
  };
}

export function attendanceReminderEmail({ name, loginUrl }) {
  return {
    subject: "You haven't marked today's attendance yet",
    html: wrap(`
      <p>Hi ${name},</p>
      <p>Looks like you haven't checked in today. Take a quick selfie to mark your attendance before the day ends.</p>
      <a href="${loginUrl.replace("/login", "/app/attendance")}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 20px;border-radius:10px;font-size:14px;font-weight:600">Mark attendance</a>
    `),
  };
}

export function projectNotifyEmail({ projectName, loginUrl }) {
  return {
    subject: `Project update: ${projectName}`,
    html: wrap(`
      <p>You've been notified about the project <strong>${projectName}</strong> — check the workspace for the latest details.</p>
      <a href="${loginUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 20px;border-radius:10px;font-size:14px;font-weight:600">Open Workspace</a>
    `),
  };
}

export function taskNotifyEmail({ taskTitle, projectName, loginUrl }) {
  return {
    subject: `Task update: ${taskTitle}`,
    html: wrap(`
      <p>You've been notified about the task <strong>${taskTitle}</strong> in project <strong>${projectName}</strong>.</p>
      <a href="${loginUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 20px;border-radius:10px;font-size:14px;font-weight:600">Open Workspace</a>
    `),
  };
}

export function passwordResetEmail({ name, email, password, loginUrl }) {
  return {
    subject: "Your password has been reset",
    html: wrap(`
      <p>Hi ${name},</p>
      <p>Your password was reset. Use the new one below to log back in:</p>
      ${credentialsBlock(email, password)}
      <a href="${loginUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 20px;border-radius:10px;font-size:14px;font-weight:600">Log in</a>
      <p style="font-size:13px;color:#737373;margin-top:20px">Didn't request this? Contact your admin right away.</p>
    `),
  };
}
