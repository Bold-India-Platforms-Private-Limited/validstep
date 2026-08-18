import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { sendMailBatch } from "../../config/mailer.js";
import { notificationEmail } from "../../utils/emailTemplates.js";

export const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { workspaceId: req.params.workspaceId },
    orderBy: { createdAt: "desc" },
  });
  res.json({ data: notifications });
});

// Creates the notification (visible in-app immediately) and, in the background, emails
// every workspace member — mirrors the old app's broadcast-email feature, but as a
// non-blocking batch so a 2k-member workspace doesn't hold the HTTP request open for
// minutes waiting on SMTP round-trips.
export const createNotification = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { title, subtitle, buttonName, buttonUrl, openInNewTab } = req.body;
  if (!title?.trim()) throw new ApiError(400, "title is required");

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    select: { user: { select: { email: true } } },
  });

  const notification = await prisma.notification.create({
    data: {
      workspaceId,
      title: title.trim(),
      subtitle: subtitle || null,
      buttonName: buttonName || null,
      buttonUrl: buttonUrl || null,
      openInNewTab: !!openInNewTab,
      recipientCount: members.length,
    },
  });

  res.status(201).json({ notification });

  // Fire-and-forget: response is already sent above, so any failure here must not flow
  // back through asyncHandler's error path (headers would already be sent).
  (async () => {
    try {
      const { subject, html } = notificationEmail({
        title: notification.title,
        subtitle: notification.subtitle,
        buttonName: notification.buttonName,
        buttonUrl: notification.buttonUrl,
        loginUrl: `${process.env.FRONTEND_URL}/login`,
      });

      const results = await sendMailBatch(members.map((m) => ({ to: m.user.email, subject, html })));
      const sentCount = results.filter(Boolean).length;

      await prisma.notification.update({
        where: { id: notification.id },
        data: { sentCount, emailSentAt: new Date() },
      });
    } catch (err) {
      console.error(`Notification email batch failed for ${notification.id}:`, err.message);
    }
  })();
});

export const updateNotification = asyncHandler(async (req, res) => {
  const { title, subtitle, buttonName, buttonUrl, openInNewTab } = req.body;
  const notification = await prisma.notification.update({
    where: { id: req.params.notificationId },
    data: {
      ...(title !== undefined && { title }),
      ...(subtitle !== undefined && { subtitle }),
      ...(buttonName !== undefined && { buttonName }),
      ...(buttonUrl !== undefined && { buttonUrl }),
      ...(openInNewTab !== undefined && { openInNewTab }),
    },
  });
  res.json({ notification });
});

export const deleteNotification = asyncHandler(async (req, res) => {
  await prisma.notification.delete({ where: { id: req.params.notificationId } });
  res.status(204).end();
});
