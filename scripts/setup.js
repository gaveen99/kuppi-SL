const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Kuppi Learning Platform...\n');

// Check if .env.local exists
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('⚠️  .env.local not found. Creating from example...');
  const examplePath = path.join(__dirname, '..', '.env.local.example');
  fs.copyFileSync(examplePath, envPath);
  console.log('✅ Created .env.local - Please add your Firebase credentials\n');
} else {
  console.log('✅ .env.local exists\n');
}

// Create uploads directory
const uploadsPath = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath);
  console.log('✅ Created uploads/ directory\n');
} else {
  console.log('✅ uploads/ directory exists\n');
}

// Create .gitkeep in uploads
const gitkeepPath = path.join(uploadsPath, '.gitkeep');
if (!fs.existsSync(gitkeepPath)) {
  fs.writeFileSync(gitkeepPath, '');
}

console.log('🎉 Setup complete!\n');
console.log('Next steps:');
console.log('1. Edit .env.local and add your Firebase credentials');
console.log('2. Run: npm install');
console.log('3. Run: npm run dev');
console.log('4. Open http://localhost:3000\n');
console.log('See QUICKSTART.md for detailed setup instructions.');
