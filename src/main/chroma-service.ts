import * as path from 'path';
import { ChildProcess, spawn } from 'child_process';

let chromaProcess: null | ChildProcess = null;

// Starts up the ChromaDB by executing `chroma run --path lemma-db`
export const startChromaDb = (): void => {
  if (chromaProcess) {
    console.log("ChromaDB server is already running");
    return;
  }
  
  const venvPath = path.join(process.cwd(), 'venv');
  const chromaRunCommand = process.platform === 'win32'
    ? path.join(venvPath, 'Scripts', 'chroma.exe')
    : path.join(venvPath, 'bin', 'chroma');

  const dbPath = path.join(process.cwd(), 'lemma-db');

  console.log('Starting ChromaDB server...');
  // Run `chroma run --path lemma-db`
  chromaProcess = spawn(chromaRunCommand, ['run', '--path', dbPath], {
    cwd: process.cwd(),
    stdio: 'inherit',
    detached: true,
    windowsHide: true
  });

  chromaProcess.on('error', (err) => {
    console.error('Failed to start Chroma:', err.message);
  });

  console.log("Started ChromaDB server with PID:", chromaProcess.pid);
};

export const endChromaDb = (): void => {
  if (chromaProcess && !isNaN(chromaProcess.pid) && !chromaProcess.killed) {
    if (process.platform === 'win32') {
      chromaProcess.kill('SIGTERM'); // Kill only the main process
    }
    else {
      process.kill(-chromaProcess.pid); // Kill the whole process group
    }
    console.log('Closed ChromaDB server with PID:', chromaProcess.pid);
    chromaProcess = null;
  }
};

export const isChromaRunning = (): boolean => {
  return chromaProcess !== null && !chromaProcess.killed;
};