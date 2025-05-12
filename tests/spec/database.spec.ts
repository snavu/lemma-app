import * as path from 'path';
import * as fs from 'fs';
import { DbClient } from '../../src/main/database';

describe('queryNotes()', () => {
  // Get content of test files
  const file1 = fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/computer.md'), 'utf8');
  const file2 = fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/circuits.md'), 'utf8');
  const notesDir = '/tests';

  const database = new DbClient();

  it('full text search 1', async () => {
    // Insert test notes into database
    await database.upsertNote(notesDir, 'computer.md', String(file1), []);
    await database.upsertNote(notesDir, 'circuits.md', String(file2), []);

    // Query the note by keyword
    const data = await database.queryNotes(notesDir, 'cpu socket');
    expect(data[0].filePath).toBe('computer.md');

    await database.deleteNote(notesDir);
  });

  it('full text search 2', async () => {
    // Insert test notes into database
    await database.upsertNote(notesDir, 'computer.md', String(file1), []);
    await database.upsertNote(notesDir, 'circuits.md', String(file2), []);

    // Query the note by keyword
    const data = await database.queryNotes(notesDir, 'kirchhoff');
    expect(data[0].filePath).toBe('circuits.md');

    await database.deleteNote(notesDir);
  });
});