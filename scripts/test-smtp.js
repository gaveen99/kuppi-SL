const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const DOCS = 'docs/auth/email-otp-setup.md';

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const raw = fs.readFileSync(envPath, 'utf8');
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value.includes('\\n')) value = value.replace(/\\n/g, '\n');
    out[key] = value;
  }
  return out;
}

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error('Usage: node scripts/test-smtp.js <recipient@example.com>');
    process.exit(1);
  }

  const env = loadEnvLocal();
  for (const k of Object.keys(env)) {
    if (process.env[k] === undefined) process.env[k] = env[k];
  }

  const host = process.env.SMTP_HOST;
  const rawPort = Number(process.env.SMTP_PORT);
  const port = Number.isFinite(rawPort) && rawPort > 0 ? rawPort : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM || user;

  if (!host || !user || !pass) {
    console.error(
      `SMTP not configured — see ${DOCS}. Need SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env.local.`
    );
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from,
      to,
      subject: 'Kuppi SMTP smoke test',
      text: 'If you can read this, Kuppi SMTP is wired up correctly.',
    });
    console.log(`✓ Sent test email to ${to}`);
  } catch (err) {
    console.error(`SMTP send failed: ${err && err.message ? err.message : err}`);
    console.error(`Check credentials and see ${DOCS} for troubleshooting.`);
    process.exit(1);
  }
}

main();
