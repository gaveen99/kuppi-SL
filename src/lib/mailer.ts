import nodemailer, { type Transporter } from 'nodemailer';

let cached: Transporter | null = null;

function getTransporter(): Transporter {
  if (cached) return cached;
  const host = process.env.SMTP_HOST;
  const rawPort = Number(process.env.SMTP_PORT);
  const port = Number.isFinite(rawPort) && rawPort > 0 ? rawPort : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      'SMTP not configured — see docs/auth/email-otp-setup.md. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env.local (Gmail: smtp.gmail.com:587 with an App Password).'
    );
  }

  cached = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return cached;
}

export interface SendOtpOptions {
  to: string;
  code: string;
  expiresInMinutes: number;
}

export async function sendOtpEmail({ to, code, expiresInMinutes }: SendOtpOptions) {
  const transporter = getTransporter();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  if (!from) throw new Error('MAIL_FROM not set');

  const subject = `Your Kuppi sign-in code: ${code}`;

  const text = [
    `Your Kuppi sign-in code is ${code}.`,
    '',
    `This code expires in ${expiresInMinutes} minutes. If you didn't request it, you can ignore this email.`,
    '',
    '— Kuppi (free learning platform for Sri Lankan students)',
  ].join('\n');

  const html = `<!doctype html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:#f8fafc; padding:24px; color:#0f172a;">
  <div style="max-width:480px; margin:0 auto; background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding:32px;">
    <h1 style="margin:0 0 16px; font-size:20px; color:#4f46e5;">Your Kuppi sign-in code</h1>
    <p style="margin:0 0 20px; color:#334155;">Enter this code to finish signing in:</p>
    <div style="font-family: monospace; font-size:32px; font-weight:700; letter-spacing:8px; background:#eef2ff; color:#4338ca; padding:16px 24px; border-radius:12px; text-align:center; margin:0 0 20px;">${code}</div>
    <p style="margin:0 0 8px; color:#64748b; font-size:13px;">Expires in ${expiresInMinutes} minutes. Single use only.</p>
    <p style="margin:0; color:#64748b; font-size:13px;">If you didn't request this, you can ignore this email.</p>
  </div>
  <p style="max-width:480px; margin:16px auto 0; color:#94a3b8; font-size:12px; text-align:center;">Kuppi — free learning platform for Sri Lankan students.</p>
</body></html>`;

  await transporter.sendMail({ from, to, subject, text, html });
}

export type ContactCategory = 'inquiry' | 'feedback' | 'complaint' | 'other';

export interface SendContactOptions {
  fromName: string;
  fromEmail: string;
  category: ContactCategory;
  subject: string;
  message: string;
  /** Where the message came from in the app (e.g., '/contact'). */
  pageContext?: string;
  /** Firebase uid of the sender, when signed in. */
  uid?: string;
  /** IP that submitted the form (hashed or raw — caller's choice). */
  ip?: string;
  /** User-Agent string for triage. */
  userAgent?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendContactEmail(opts: SendContactOptions) {
  const transporter = getTransporter();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  if (!from) throw new Error('MAIL_FROM not set');
  const inbox = process.env.CONTACT_INBOX || 'you@example.com';

  const categoryLabel: Record<ContactCategory, string> = {
    inquiry: 'Inquiry',
    feedback: 'Feedback',
    complaint: 'Complaint',
    other: 'Other',
  };
  const label = categoryLabel[opts.category] ?? 'Message';

  const subject = `[Kuppi · ${label}] ${opts.subject}`;

  const metaLines = [
    `From: ${opts.fromName} <${opts.fromEmail}>`,
    `Category: ${label}`,
    opts.uid ? `Firebase uid: ${opts.uid}` : null,
    opts.pageContext ? `Page: ${opts.pageContext}` : null,
    opts.ip ? `IP (hashed): ${opts.ip}` : null,
    opts.userAgent ? `User-Agent: ${opts.userAgent}` : null,
  ].filter(Boolean);

  const text = [
    ...metaLines,
    '',
    '— Message —',
    opts.message,
    '',
    '— Sent via your-domain.com /contact —',
  ].join('\n');

  const html = `<!doctype html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:#f8fafc; padding:24px; color:#0f172a;">
  <div style="max-width:600px; margin:0 auto; background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding:28px;">
    <h1 style="margin:0 0 4px; font-size:18px; color:#4f46e5;">${escapeHtml(label)} from Kuppi contact form</h1>
    <p style="margin:0 0 16px; color:#64748b; font-size:13px;">Sent via your-domain.com /contact</p>
    <table style="width:100%; font-size:14px; color:#334155; border-collapse:collapse;">
      <tr><td style="padding:4px 0; color:#64748b; width:120px;">From</td><td style="padding:4px 0;">${escapeHtml(opts.fromName)} &lt;${escapeHtml(opts.fromEmail)}&gt;</td></tr>
      <tr><td style="padding:4px 0; color:#64748b;">Category</td><td style="padding:4px 0;">${escapeHtml(label)}</td></tr>
      <tr><td style="padding:4px 0; color:#64748b;">Subject</td><td style="padding:4px 0;">${escapeHtml(opts.subject)}</td></tr>
      ${opts.uid ? `<tr><td style="padding:4px 0; color:#64748b;">Firebase uid</td><td style="padding:4px 0;">${escapeHtml(opts.uid)}</td></tr>` : ''}
      ${opts.pageContext ? `<tr><td style="padding:4px 0; color:#64748b;">Page</td><td style="padding:4px 0;">${escapeHtml(opts.pageContext)}</td></tr>` : ''}
      ${opts.ip ? `<tr><td style="padding:4px 0; color:#64748b;">IP (hashed)</td><td style="padding:4px 0; font-family:monospace; font-size:12px;">${escapeHtml(opts.ip)}</td></tr>` : ''}
      ${opts.userAgent ? `<tr><td style="padding:4px 0; color:#64748b;">User-Agent</td><td style="padding:4px 0; font-family:monospace; font-size:11px; word-break:break-all;">${escapeHtml(opts.userAgent)}</td></tr>` : ''}
    </table>
    <hr style="border:none; border-top:1px solid #e5e7eb; margin:20px 0;" />
    <pre style="white-space:pre-wrap; word-wrap:break-word; font-family:inherit; font-size:14px; color:#0f172a; margin:0;">${escapeHtml(opts.message)}</pre>
  </div>
</body></html>`;

  await transporter.sendMail({
    from,
    to: inbox,
    replyTo: `${opts.fromName} <${opts.fromEmail}>`,
    subject,
    text,
    html,
  });
}
