const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting setup...');
try {
  // 1. Install pnpm locally or use npx
  const tempDir = path.join(__dirname, 'temp-react');
  if (!fs.existsSync(tempDir)) {
      console.log('Creating temp react app...');
      execSync('npx -y --silent create-vite temp-react --template react', { stdio: 'inherit', cwd: __dirname });
  }

  // 2. Move contents to frontend/
  console.log('Moving contents...');
  const targetDir = path.join(__dirname, 'frontend');
  
  const moveRecursive = (src, dest) => {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    
    fs.readdirSync(src).forEach(item => {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      
      if (fs.lstatSync(srcPath).isDirectory()) {
         moveRecursive(srcPath, destPath);
      } else {
         fs.copyFileSync(srcPath, destPath);
      }
    });
  };

  moveRecursive(tempDir, targetDir);

  // 3. Remove temp directory
  fs.rmSync(tempDir, { recursive: true, force: true });

  console.log('Done moving. Installing pnpm and running pnpm install in frontend...');
  // 4. Install dependencies using pnpm inside frontend folder
  execSync('npm install -g pnpm', { stdio: 'inherit' });
  execSync('pnpm install', { stdio: 'inherit', cwd: targetDir });

  console.log('Setup finished successfully.');
} catch (e) {
  console.error("Error occurred:", e.message);
}
