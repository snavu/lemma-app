import * as path from 'path';
import { ChildProcess, spawn } from 'child_process';
import { app } from 'electron';

let chromaProcess: null | ChildProcess = null;

// Get the correct paths for development vs production
const isDev = !app.isPackaged;

const getVenvPath = (): string => {
  if (isDev) {
    // Development: use local venv
    return path.join(process.cwd(), 'venv');
  } else {
    // Production: use bundled venv from resources
    return path.join(process.resourcesPath, 'venv');
  }
};

const getDbPath = (): string => {
  if (isDev) {
    // Development: use local db
    return path.join(process.cwd(), 'lemma-db');
  } else {
    // Production: use user data directory for database
    // This allows the database to persist and be writable
    return path.join(app.getPath('userData'), 'lemma-db');
  }
};

const getChromaExecutable = (): string => {
  const venvPath = getVenvPath();
  const isWin = process.platform === 'win32';
  
  return isWin
    ? path.join(venvPath, 'Scripts', 'chroma.exe')
    : path.join(venvPath, 'bin', 'chroma');
};

// Starts up the ChromaDB by executing `chroma run --path lemma-db`
export const startChromaDb = (): void => {
  if (chromaProcess) {
    console.log("ChromaDB server is already running");
    return;
  }
  
  const chromaExecutable = getChromaExecutable();
  const dbPath = getDbPath();

  // Ensure database directory exists
  const fs = require('fs');
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }

  console.log('Starting ChromaDB server...');
  console.log('ChromaDB executable:', chromaExecutable);
  console.log('Database path:', dbPath);
  
  // Run `chroma run --path lemma-db`
  chromaProcess = spawn(chromaExecutable, ['run', '--path', dbPath], {
    cwd: isDev ? process.cwd() : process.resourcesPath,
    stdio: 'inherit',
    detached: true,
    windowsHide: true
  });

  chromaProcess.on('error', (err) => {
    console.error('Failed to start ChromaDB:', err.message);
  
  });

  chromaProcess.on('spawn', () => {
    console.log("Started ChromaDB server with PID:", chromaProcess?.pid);
  });
};


export const endChromaDb = (): void => {
  if (chromaProcess && !isNaN(chromaProcess.pid!) && !chromaProcess.killed) {
    if (process.platform === 'win32') {
      chromaProcess.kill('SIGTERM'); // Kill only the main process
    } else {
      process.kill(-chromaProcess.pid!); // Kill the whole process group
    }
    console.log('Closed ChromaDB server with PID:', chromaProcess.pid);
    chromaProcess = null;
  }
};

export const isChromaRunning = (): boolean => {
  return chromaProcess !== null && !chromaProcess.killed;
};