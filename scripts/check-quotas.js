const fs = require('fs');
const path = require('path');

const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const SPARK = {
  firestoreStorageBytes: 1 * 1024 * 1024 * 1024,
  firestoreReadsPerDay: 50000,
  firestoreWritesPerDay: 20000,
  authMAU: 50000,
};

const WARN_AT = 0.8;

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(path.join(__dirname, '..', '.env.production'));
loadEnvFile(path.join(__dirname, '..', '.env.local'));

function initAdmin() {
  if (getApps().length) return;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) {
    console.error('Missing FIREBASE_ADMIN_* variables in .env.production or .env.local');
    process.exit(1);
  }
  if (privateKey.includes('\\n')) privateKey = privateKey.replace(/\\n/g, '\n');
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function pctBar(ratio) {
  const pct = (ratio * 100).toFixed(1);
  const mark = ratio >= 1 ? '🛑' : ratio >= WARN_AT ? '⚠️ ' : '✅';
  return `${mark} ${pct}%`;
}

async function countCollections(db) {
  const collections = await db.listCollections();
  const rows = [];
  let totalDocs = 0;
  for (const col of collections) {
    const agg = await col.count().get();
    const docs = agg.data().count;
    totalDocs += docs;
    rows.push({ name: col.id, docs });
  }
  rows.sort((a, b) => b.docs - a.docs);
  return { rows, totalDocs };
}

async function countAuthUsers(auth) {
  let total = 0;
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    total += page.users.length;
    pageToken = page.pageToken;
    if (total >= SPARK.authMAU) break;
  } while (pageToken);
  return total;
}

async function main() {
  initAdmin();
  const db = getFirestore();
  const auth = getAuth();

  console.log('Kuppi free-tier quota report');
  console.log(`  project: ${process.env.FIREBASE_ADMIN_PROJECT_ID}`);
  console.log(`  time:    ${new Date().toISOString()}\n`);

  let warn = false;

  console.log('Firestore (Spark caps: 1 GiB storage, 50K reads/day, 20K writes/day)');
  let totalDocs = 0;
  let estBytes = 0;
  try {
    const res = await countCollections(db);
    totalDocs = res.totalDocs;
    const nameCol = Math.max(12, ...res.rows.map((r) => r.name.length));
    console.log(`  ${'Collection'.padEnd(nameCol)}  Docs`);
    console.log(`  ${'-'.repeat(nameCol)}  ${'-'.repeat(8)}`);
    for (const r of res.rows) {
      console.log(`  ${r.name.padEnd(nameCol)}  ${String(r.docs).padStart(8)}`);
    }
    estBytes = totalDocs * 1024;
    const storageRatio = estBytes / SPARK.firestoreStorageBytes;
    console.log(`\n  total docs:           ${totalDocs}`);
    console.log(`  estimated storage:    ${fmtBytes(estBytes)}  (rough: docs × 1 KB)`);
    console.log(`  vs 1 GiB Spark cap:   ${pctBar(storageRatio)}`);
    if (storageRatio >= WARN_AT) warn = true;
  } catch (err) {
    console.log(`  ERROR: ${err.message}`);
    if (String(err.message).includes('billing')) {
      console.log('  → Firestore DB is in Enterprise edition. Recreate as Standard to stay on Spark.');
    }
    warn = true;
  }

  console.log('\nFirebase Auth (Spark cap: 50K MAU)');
  try {
    const users = await countAuthUsers(auth);
    const ratio = users / SPARK.authMAU;
    const label = users >= SPARK.authMAU ? `${users}+` : String(users);
    console.log(`  total users:          ${label}`);
    console.log(`  vs 50K Spark cap:     ${pctBar(ratio)}`);
    if (ratio >= WARN_AT) warn = true;
  } catch (err) {
    console.log(`  ERROR: ${err.message}`);
    warn = true;
  }

  console.log('\nNote: daily read/write counts need Cloud Monitoring (Blaze).');
  console.log('      For Spark, watch doc counts + Auth MAU here and the Firebase');
  console.log('      console Usage tab for real-time ops usage.\n');

  if (warn) {
    console.log('Status: WARNING — at least one metric is ≥80% or failed. Investigate above.');
    process.exit(1);
  } else {
    console.log('Status: OK — within Spark free tier.');
  }
}

main().catch((err) => {
  console.error('check-quotas failed:', err);
  process.exit(1);
});
