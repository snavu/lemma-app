import * as path from 'path';
import * as fs from 'fs';
import { DbClient } from '../../src/main/database';

const testFilePaths = ['tests/fixtures/add-delete/computer.md', 'tests/fixtures/add-delete/circuits.md'];
const testFiles = testFilePaths.map((filePath: string) => ({
  filePath: filePath,
  fileName: path.basename(filePath),
  content: fs.readFileSync(path.join(process.cwd(), filePath), 'utf8')
}));

const notesDir = 'add-delete';
const database = new DbClient();

describe('upsertNotes()', () => {
  it('insert note 1', async () => {
    // Insert individual note into database
    const filePath = testFilePaths[0];
    await database.upsertNotes(notesDir, filePath, testFiles.find(value => value.filePath === filePath).content, 'user');

    // Query notes
    const data = await database.queryNotes(notesDir);
    expect(data.length).toBe(1);
    expect(data[0].filePath).toBe(filePath);

    await database.deleteNotes(notesDir);
  });

  it('insert note 2', async () => {
    // Insert individual note into database
    const filePath = testFilePaths[1];
    await database.upsertNotes(notesDir, filePath, testFiles.find(value => value.filePath === filePath).content, 'user');

    // Query notes
    const data = await database.queryNotes(notesDir);
    expect(data.length).toBe(1);
    expect(data[0].filePath).toBe(filePath);

    await database.deleteNotes(notesDir);
  });

  it('insert all notes', async () => {
    // Insert all notes into database
    await database.upsertNotes(notesDir, testFilePaths, testFiles.map(value => { return value.content }), Array(testFiles.length).fill('user'));

    // Query notes
    const data = await database.queryNotes(notesDir);
    // Expect results to have the same number of docs as the test files
    expect(data.length).toBe(testFiles.length);
    // Check each file path
    expect(new Set(data.map(doc => { return doc.filePath }))).toEqual(new Set(testFilePaths));

    await database.deleteNotes(notesDir);
  });
});

describe('deleteNotes()', () => {
  it ('delete notes 1', async () => {
    // Insert test notes into database
    await database.upsertNotes(notesDir, testFilePaths, testFiles.map(value => { return value.content }), Array(testFiles.length).fill('user'));

    // Delete individual note
    const deletedFilename = 'tests/fixtures/add-delete/computer.md';
    await database.deleteNotes(notesDir, deletedFilename);
    
    // Ensure note is deleted
    const data = await database.queryNotes(notesDir);
    expect(data.map(note => { return path.basename(note.filePath) }).includes(deletedFilename)).toBe(false);

    await database.deleteNotes(notesDir);
  });

  it ('delete notes 2', async () => {
    // Insert test notes into database
    await database.upsertNotes(notesDir, testFilePaths, testFiles.map(value => { return value.content }), Array(testFiles.length).fill('user'));

    // Delete individual note
    const deletedFilename = 'tests/fixtures/add-delete/circuits.md';
    await database.deleteNotes(notesDir, deletedFilename);
    
    // Ensure note is deleted
    const data = await database.queryNotes(notesDir);
    expect(data.map(note => { return path.basename(note.filePath) }).includes(deletedFilename)).toBe(false);

    await database.deleteNotes(notesDir);
  });

  it ('delete all notes', async () => {
    // Insert test notes into database
    await database.upsertNotes(notesDir, testFilePaths, testFiles.map(value => { return value.content }), Array(testFiles.length).fill('user'));

    // Delete all notes
    await database.deleteNotes(notesDir);
    
    // Ensure all notes are deleted
    const data = await database.queryNotes(notesDir);
    expect(data.length).toBe(0);

    await database.deleteNotes(notesDir);
  });
});