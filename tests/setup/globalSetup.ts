import * as path from 'path';
import * as fs from 'fs';
import { ChildProcess, spawn, spawnSync } from 'child_process';
import { rm } from 'fs/promises';

let chromaProcess: null | ChildProcess;

const tempFile = path.join(__dirname, 'child-process.json');
const fixtureDir = 'tests/fixtures';
const dbPath = path.join(process.cwd(), 'lemma-test-db');

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Starts up the ChromaDB by executing `chroma run --path lemma-db`
const startChromaDb = (): void  => {
  const venvPath = path.join(process.cwd(), 'venv');
  const chromaRunCommand = process.platform === 'win32'
    ? path.join(venvPath, 'Scripts', 'chroma.exe')
    : path.join(venvPath, 'bin', 'chroma');

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

const endChromaDb = async (): Promise<void> => {
  try {
    const { pid } = JSON.parse(fs.readFileSync(tempFile, 'utf8'));
    process.kill(pid, 'SIGTERM');
    fs.unlinkSync(tempFile);
    await fs.promises.rm(dbPath, { recursive: true, force: true });
    process.stdout.write(`Closed ChromaDB server with PID: ${pid}\n`);
  } catch (err) {
    console.warn('Failed to clean up child process:', err);
  }
};

const initFixtures = (): void => {
  const child = spawn('npm', ['run', 'seed', '--', fixtureDir], { stdio: 'inherit' });
  child.on('exit', () => console.log('Initialized fixtures'));
}

const delFixtures = async (): Promise<void> => {
  await fs.promises.rm(fixtureDir, { recursive: true, force: true });
  if (!fs.existsSync(fixtureDir)) {
    fs.mkdirSync(fixtureDir);
  }
  fs.writeFileSync(path.join(fixtureDir, '.gitkeep'), '');
}

module.exports = async () => {
  startChromaDb();
  initFixtures();
  // Terminate ChromaDB server if Ctrl+C
  process.once('SIGINT', async () => {
    await endChromaDb();
    await delFixtures();
    process.exit(0);
  });
  await sleep(2000);
};