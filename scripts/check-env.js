const fs = require('fs');
const path = require('path');

console.log('🔍 Checking environment configuration...\n');

const envPath = path.join(__dirname, '..', '.env.local');

if (!fs.existsSync(envPath)) {
  console.log('❌ .env.local not found');
  console.log('   Run: cp .env.local.example .env.local\n');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');

const requiredVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

let allSet = true;

requiredVars.forEach(varName => {
  const regex = new RegExp(`${varName}=(.+)`);
  const match = envContent.match(regex);
  
  if (!match || match[1].includes('your_') || match[1].trim() === '') {
    console.log(`❌ ${varName} is not set`);
    allSet = false;
  } else {
    console.log(`✅ ${varName}`);
  }
});

console.log('');

if (allSet) {
  console.log('🎉 All required environment variables are set!');
  console.log('   You can now run: npm run dev\n');
} else {
  console.log('⚠️  Please configure missing variables in .env.local');
  console.log('   See QUICKSTART.md for instructions\n');
  process.exit(1);
}
