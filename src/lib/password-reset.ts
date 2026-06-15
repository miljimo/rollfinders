import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { queueEmail, sendQueuedEmail } from "@/lib/reliable-email";

const tokenBytes = 32;
const resetExpiryHours = 24;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function resetUrl(token: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${baseUrl}/reset-password?token=${token}`;
}

function expiryDate() {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + resetExpiryHours);
  return expiresAt;
}

export async function queuePasswordResetEmail(user: { id: string; email: string; name?: string | null }) {
  const token = randomBytes(tokenBytes).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = expiryDate();
  const url = resetUrl(token);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const outboundEmail = await queueEmail({
    userId: user.id,
    to: user.email,
    subject: "Reset your RollFinders password",
    text: `Hi${user.name ? ` ${user.name}` : ""},\n\nUse this link to reset your RollFinders password. The link expires in ${resetExpiryHours} hours.\n\n${url}\n\nIf you did not request this password reset, you can safely ignore this email.`,
    html: `<p>Hi${user.name ? ` ${user.name}` : ""},</p><p>Use this link to reset your RollFinders password. The link expires in ${resetExpiryHours} hours.</p><p><a href="${url}">Reset password</a></p><p>If you did not request this password reset, you can safely ignore this email.</p>`,
  });
  await sendQueuedEmail(outboundEmail.id);

  return { expiresAt };
}

export async function requestPasswordResetForEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes("@")) return { success: true };

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, name: true, status: true, disabled: true },
  });
  if (!user || user.status === "DISABLED" || user.disabled) return { success: true };

  await queuePasswordResetEmail(user);
  return { success: true };
}

export async function getValidPasswordResetToken(token: string) {
  return prisma.passwordResetToken.findFirst({
    where: {
      tokenHash: hashToken(token),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });
}

export async function resetPasswordWithToken(token: string, password: string) {
  const resetToken = await getValidPasswordResetToken(token);
  if (!resetToken) return { ok: false, message: "This password reset link is invalid or expired." };

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    });
    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });
  });

  return { ok: true, email: resetToken.user.email };
}
