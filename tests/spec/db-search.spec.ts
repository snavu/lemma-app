import * as path from 'path';
import * as fs from 'fs';
import { DbClient } from '../../src/main/database';

const testFilePaths = ['tests/fixtures/search/computer.md', 'tests/fixtures/search/circuits.md'];
const testFiles = testFilePaths.map((filePath: string) => ({
  filePath: filePath,
  fileName: path.basename(filePath),
  content: fs.readFileSync(path.join(process.cwd(), filePath), 'utf8')
}));

const notesDir = 'search';
const database = new DbClient();

describe('queryNotes()', () => {
  it('full text search 1', async () => {
    // Insert test notes into database
    await database.upsertNotes(notesDir, testFilePaths, testFiles.map(value => { return value.content }), Array(testFiles.length).fill('user'));

    // Query the note by keyword
    const data = await database.queryNotes(notesDir, 'cpu inside');
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0].filePath).toBe('tests/fixtures/search/computer.md');

    await database.deleteNotes(notesDir);
  });

  it('full text search 2', async () => {
    // Insert test notes into database
    await database.upsertNotes(notesDir, testFilePaths, testFiles.map(value => { return value.content }), Array(testFiles.length).fill('user'));

    // Query the note by keyword
    const data = await database.queryNotes(notesDir, 'kirchhoff');
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0].filePath).toBe('tests/fixtures/search/circuits.md');

    await database.deleteNotes(notesDir);
  });

  it('query all notes', async () => {
    // Insert test notes into database
    await database.upsertNotes(notesDir, testFilePaths, testFiles.map(value => { return value.content }), Array(testFiles.length).fill('user'));

    // Query all notes
    const data = await database.queryNotes(notesDir);
    expect(data.length).toBe(testFiles.length);
    // Check each file path
    expect(new Set(data.map(doc => { return doc.filePath }))).toEqual(new Set(testFilePaths));

    await database.deleteNotes(notesDir);
  });

  it('similarity search 1', async () => {
    // Insert all notes into database
    await database.upsertNotes(notesDir, testFilePaths, testFiles.map(value => { return value.content }), Array(testFiles.length).fill('user'));

    // Query notes by similarity search
    const data = await database.queryNotes(notesDir, 'computer components', 'similarity');
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0].filePath).toBe('tests/fixtures/search/computer.md');

    await database.deleteNotes(notesDir);
  });

  it('similarity search 2', async () => {
    // Insert all notes into database
    await database.upsertNotes(notesDir, testFilePaths, testFiles.map(value => { return value.content }), Array(testFiles.length).fill('user'));

    // Query notes by similarity search
    const data = await database.queryNotes(notesDir, 'formula for measuring resistance', 'similarity');
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0].filePath).toBe('tests/fixtures/search/circuits.md');

    await database.deleteNotes(notesDir);
  });

  it('tag search 1', async () => {
    // Insert test notes into database
    await database.upsertNotes(notesDir, testFilePaths, testFiles.map(value => { return value.content }), Array(testFiles.length).fill('user'));

    // Query the note by tag
    const data = await database.queryNotes(notesDir, 'motherboard', 'tag');
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0].filePath).toBe('tests/fixtures/search/computer.md');

    await database.deleteNotes(notesDir);
  });

  it('tag search 2', async () => {
    // Insert test notes into database
    await database.upsertNotes(notesDir, testFilePaths, testFiles.map(value => { return value.content }), Array(testFiles.length).fill('user'));

    // Query the note by tag
    const searchQueries = ['ohms-law', 'kirchhoff']

    await Promise.all(searchQueries.map(async value => {
      const data = await database.queryNotes(notesDir, value, 'tag');
      expect(data.length).toBeGreaterThanOrEqual(1);
      expect(data[0].filePath).toBe('tests/fixtures/search/circuits.md');
    }));

    await database.deleteNotes(notesDir);
  });
});