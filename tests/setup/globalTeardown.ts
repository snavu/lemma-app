import * as path from 'path';
import * as fs from 'fs';
import { rm } from 'fs/promises';

const tempFile = path.join(__dirname, 'child-process.json');
const fixtureDir = 'tests/fixtures';
const dbPath = path.join(process.cwd(), 'lemma-test-db');

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

const delFixtures = async (): Promise<void> => {
  await fs.promises.rm(fixtureDir, { recursive: true, force: true });
  if (!fs.existsSync(fixtureDir)) {
    fs.mkdirSync(fixtureDir);
  }
}

module.exports = async () => {
  await endChromaDb();
  await delFixtures();
};