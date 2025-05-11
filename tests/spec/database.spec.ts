import * as path from 'path';
import * as fs from 'fs';
import { upsertNote, queryNotes, queryNotesByTag, deleteNote } from '../../src/main/database';

describe('queryNotes()', () => {
  // Get content of test files
  const file1 = fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/computer.md'), 'utf8');
  const file2 = fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/circuits.md'), 'utf8');
  const notesDir = '/tests';

  it('full text search 1', async () => {
    // Insert test notes into database
    await upsertNote(notesDir, 'computer.md', String(file1), []);
    await upsertNote(notesDir, 'circuits.md', String(file2), []);

    // Query the note by keyword
    const data = await queryNotes('cpu socket', notesDir);
    expect(data[0].filePath).toBe('computer.md');

    await deleteNote(notesDir, 'computer.md');
    await deleteNote(notesDir, 'circuits.md');
  });

  it('full text search 2', async () => {
    // Insert test notes into database
    await upsertNote(notesDir, 'computer.md', String(file1), []);
    await upsertNote(notesDir, 'circuits.md', String(file2), []);

    // Query the note by keyword
    const data = await queryNotes('kirchhoff', notesDir);
    expect(data[0].filePath).toBe('circuits.md');

    await deleteNote(notesDir, 'computer.md');
    await deleteNote(notesDir, 'circuits.md');
  });
});