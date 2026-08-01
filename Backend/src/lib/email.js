import nodemailer from "nodemailer";

// Email is intentionally optional: local development works without SMTP credentials.
export async function sendLoginEmail(user) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return false;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to: user.email,
    subject: "New sign-in to Chat App",
    text: `Hi ${user.fullName}, your account (@${user.username}) was just signed in. If this was not you, change your password immediately.`,
  });
  return true;
}
