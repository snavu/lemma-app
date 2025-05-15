const { execSync } = require('child_process');
const { existsSync } = require('fs');

const isWin = process.platform === 'win32';

try {
  if (existsSync('venv')) {
    console.log('Virtual environment already exists, skipping creation.');
  } else {
    try {
      execSync(isWin ? 'python -m venv venv' : 'python3 -m venv venv', { stdio: 'inherit' });
    } catch (e) {
      try {
        execSync(!isWin ? 'python -m venv venv' : 'python3 -m venv venv', { stdio: 'inherit' });
      } catch (e2) {
        console.error('Could not create virtual environment. Please ensure Python is installed correctly.');
        process.exit(1);
      }
    }
  }

  const pip = isWin ? 'venv\\Scripts\\pip' : 'venv/bin/pip';
  try {
    // Install both ChromaDB and SGLang
    execSync(`${pip} install chromadb sglang`, { stdio: 'inherit' });
  } catch (pipError) {
    console.error('Failed to install packages with pip. Trying pip3...');
    const pip3 = isWin ? 'venv\\Scripts\\pip3' : 'venv/bin/pip3';
    try {
      execSync(`${pip3} install chromadb sglang`, { stdio: 'inherit' });
    } catch (pip3Error) {
      console.error('Package installation failed. You may need to run this command with administrator/sudo privileges.');
      process.exit(1);
    }
  }
} catch (mainError) {
  console.error('Unexpected error:', mainError);
  process.exit(1);
}