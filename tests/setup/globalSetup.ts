import * as path from 'path';
import * as fs from 'fs';
import { ChildProcess, spawn, spawnSync } from 'child_process';

let chromaProcess: null | ChildProcess;

const tempFile = path.join(__dirname, 'child-process.json');

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Starts up the ChromaDB by executing `chroma run --path lemma-db`
const startChromaDb = (): void  => {
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

  fs.writeFileSync(tempFile, JSON.stringify({ pid: chromaProcess.pid }));

  chromaProcess.unref();
};

module.exports = async () => {
  startChromaDb();
  await sleep(2000);
};