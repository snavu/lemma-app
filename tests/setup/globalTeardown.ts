import * as path from 'path';
import * as fs from 'fs';

const tempFile = path.join(__dirname, 'child-process.json');

const endChromaDb = (): void => {
  try {
    const { pid } = JSON.parse(fs.readFileSync(tempFile, 'utf8'));
    process.kill(pid, 'SIGTERM');
    fs.unlinkSync(tempFile);
    process.stdout.write(`Closed ChromaDB server with PID: ${pid}\n`);
  } catch (err) {
    console.warn('Failed to clean up child process:', err);
  }
};

module.exports = async () => {
  endChromaDb();
};