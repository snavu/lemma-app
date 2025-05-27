import * as path from 'path';
import * as fs from 'fs';
import { DbClient, FileType } from '../../src/main/database';

const fixturePath = 'tests/fixtures/db-test';
const testFilePaths = fs.readdirSync(fixturePath).filter(file => file.endsWith('.md')).map(file => path.join(fixturePath, file));
const testFiles = testFilePaths.map((filePath: string) => ({
  filePath: filePath,
  fileName: path.basename(filePath),
  content: fs.readFileSync(filePath, 'utf8')
}));

const searchMatch = [
  { file: path.join(fixturePath, 'Compiler Design.md'), similarityQuery: 'steps to compile', fullTextQuery: 'phases of compilation' },
  { file: path.join(fixturePath, 'Propositional Calculus.md'), similarityQuery: 'what is propositional calculus', fullTextQuery: 'The principle of compositionality'},
]

const notesDir = fixturePath;
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
    await database.upsertNotes(notesDir, testFilePaths, testFiles.map(value => value.content), Array(testFiles.length).fill('user'));

    // Query notes
    const data = await database.queryNotes(notesDir);
    // Expect results to have the same number of docs as the test files
    expect(data.length).toBe(testFiles.length);
    // Check each file path
    expect(new Set(data.map(doc => doc.filePath))).toEqual(new Set(testFilePaths));

    await database.deleteNotes(notesDir);
  });
});

describe('queryNotes()', () => {
  it('full text search 1', async () => {
    // Insert test notes into database
    await database.upsertNotes(notesDir, testFilePaths, testFiles.map(value => value.content), Array(testFiles.length).fill('user'));

    // Query the note by keyword
    const data = await database.queryNotes(notesDir, { searchQuery: searchMatch[0].fullTextQuery });
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0].filePath).toBe(searchMatch[0].file);

    await database.deleteNotes(notesDir);
  });

  it('full text search 2', async () => {
    // Insert test notes into database
    await database.upsertNotes(notesDir, testFilePaths, testFiles.map(value => value.content), Array(testFiles.length).fill('user'));

    // Query the note by keyword
    const data = await database.queryNotes(notesDir, { searchQuery: searchMatch[1].fullTextQuery });
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0].filePath).toBe(searchMatch[1].file);

    await database.deleteNotes(notesDir);
  });

  it('query all notes', async () => {
    // Insert test notes into database
    await database.upsertNotes(notesDir, testFilePaths, testFiles.map(value => value.content), Array(testFiles.length).fill('user'));

    // Query all notes
    const data = await database.queryNotes(notesDir);
    expect(data.length).toBe(testFiles.length);
    // Check each file path
    expect(new Set(data.map(doc => doc.filePath))).toEqual(new Set(testFilePaths));

    await database.deleteNotes(notesDir);
  });

  it('similarity search 1', async () => {
    // Insert all notes into database
    await database.upsertNotes(notesDir, testFilePaths, testFiles.map(value => value.content), Array(testFiles.length).fill('user'));

    // Query notes by similarity search
    const data = await database.queryNotes(notesDir, { searchQuery: searchMatch[0].similarityQuery, searchMode: 'similarity' });
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0].filePath).toBe(searchMatch[0].file);

    await database.deleteNotes(notesDir);
  });

  it('similarity search 2', async () => {
    // Insert all notes into database
    await database.upsertNotes(notesDir, testFilePaths, testFiles.map(value => value.content), Array(testFiles.length).fill('user'));

    // Query notes by similarity search
    const data = await database.queryNotes(notesDir, { searchQuery: searchMatch[1].similarityQuery, searchMode: 'similarity' });
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0].filePath).toBe(searchMatch[1].file);

    await database.deleteNotes(notesDir);
  });

  it('search limit', async () => {
    // Insert all notes into database
    await database.upsertNotes(notesDir, testFilePaths, testFiles.map(value => value.content), Array(testFiles.length).fill('user'));

    // Query top n notes by similarity search
    const randomNum = Math.floor(Math.random() * testFiles.length) + 1;
    const data = await database.queryNotes(notesDir, { searchQuery: searchMatch[1].similarityQuery, searchMode: 'similarity', limit: randomNum });
    expect(data.length).toBe(randomNum);

    await database.deleteNotes(notesDir);
  });

  it('query by file type', async () => {
    // Split files by type
    const size = Math.ceil(testFiles.length / 3);
    const userType = testFiles.slice(0, size).map(file => { return {...file, type: 'user' as FileType}});
    const assistedType = testFiles.slice(size, size * 2).map(file => { return {...file, type: 'assisted' as FileType}});
    const generatedType = testFiles.slice(size * 2).map(file => { return {...file, type: 'generated' as FileType}});

    // Insert files by different types
    for (const files of [userType, assistedType, generatedType]) {
      await database.upsertNotes(
        notesDir,
        files.map(file => file.filePath),
        files.map(file => file.content),
        files.map(file => file.type)
      );
    }

    // Query user-type notes
    const allFiles = [
      { files: userType, type: 'user' as FileType},
      { files: assistedType, type: 'assisted' as FileType},
      { files: generatedType, type: 'generated' as FileType }
    ]

    for (const {files, type} of allFiles) {
      const data = await database.queryNotes(notesDir, { filterByType: type });
      expect(data.length).toBe(files.length);
      expect(new Set(data.map(doc => doc.filePath))).toEqual(new Set(files.map(file => file.filePath)));
    }

    await database.deleteNotes(notesDir);
  });

  it('query by multiple file types', async () => {
    // Split files by type
    const size = Math.ceil(testFiles.length / 3);
    const userType = testFiles.slice(0, size).map(file => { return {...file, type: 'user' as FileType}});
    const assistedType = testFiles.slice(size, size * 2).map(file => { return {...file, type: 'assisted' as FileType}});
    const generatedType = testFiles.slice(size * 2).map(file => { return {...file, type: 'generated' as FileType}});

    const userAndAssistedType = [...userType, ...assistedType];

    // Insert files by different types
    for (const files of [userType, assistedType, generatedType]) {
      await database.upsertNotes(
        notesDir,
        files.map(file => file.filePath),
        files.map(file => file.content),
        files.map(file => file.type)
      );
    }

    const userAndAssistedData = await database.queryNotes(notesDir, { filterByType: ['user', 'assisted'] });
    expect(userAndAssistedData.length).toBe(userAndAssistedType.length);
    expect(new Set(userAndAssistedData.map(doc => doc.filePath ))).toEqual(new Set(userAndAssistedType.map(file => file.filePath)));

    await database.deleteNotes(notesDir);
  });

  it('mixed param query', async () => {
    const nResults = 3;
    const assistedTypeNum = Math.floor(Math.random() * (testFiles.length - nResults + 1)) + nResults;

    // Split user-type and assisted-type notes
    const assistedType = testFiles.slice(0, assistedTypeNum).map(file => { return {...file, type: 'assisted' as FileType}});
    const userType = testFiles.slice(assistedTypeNum).map(file => { return {...file, type: 'user' as FileType}});
    
    // Insert all notes
    for (const files of [userType, assistedType]) {
      await database.upsertNotes(
        notesDir,
        files.map(file => file.filePath),
        files.map(file => file.content),
        files.map(file => file.type)
      );
    }

    // Ensure target note is assisted-type
    const targetFile = searchMatch[0];
    await database.upsertNotes(notesDir, targetFile.file, testFiles.find(value => value.filePath === targetFile.file).content, 'assisted');

    // Query notes by similarity search, filter assisted-type notes, and limit to n results
    const data = await database.queryNotes(notesDir, { searchQuery: targetFile.similarityQuery, searchMode: 'similarity', filterByType: 'assisted', limit: nResults });
    expect(data.length).toBe(nResults);
    expect(data[0].filePath).toBe(targetFile.file);

    await database.deleteNotes(notesDir);

  });

  // it('tag search 1', async () => {
  //   // Insert test notes into database
  //   await database.upsertNotes(notesDir, testFilePaths, testFiles.map(value => { return value.content }), Array(testFiles.length).fill('user'));

  //   // Query the note by tag
  //   const data = await database.queryNotes(notesDir, 'motherboard', 'tag');
  //   expect(data.length).toBeGreaterThanOrEqual(1);
  //   expect(data[0].filePath).toBe('tests/fixtures/computer.md');

  //   await database.deleteNotes(notesDir);
  // });

  // it('tag search 2', async () => {
  //   // Insert test notes into database
  //   await database.upsertNotes(notesDir, testFilePaths, testFiles.map(value => { return value.content }), Array(testFiles.length).fill('user'));

  //   // Query the note by tag
  //   const searchQueries = ['ohms-law', 'kirchhoff']

  //   await Promise.all(searchQueries.map(async value => {
  //     const data = await database.queryNotes(notesDir, value, 'tag');
  //     expect(data.length).toBeGreaterThanOrEqual(1);
  //     expect(data[0].filePath).toBe('tests/fixtures/circuits.md');
  //   }));

  //   await database.deleteNotes(notesDir);
  // });
});

describe('deleteNotes()', () => {
  it('delete notes 1', async () => {
    // Insert test notes into database
    await database.upsertNotes(notesDir, testFilePaths, testFiles.map(value => value.content), Array(testFiles.length).fill('user'));

    // Delete individual note
    const deletedFilename = testFilePaths[0];
    await database.deleteNotes(notesDir, deletedFilename);
    
    // Ensure note is deleted
    const data = await database.queryNotes(notesDir);
    expect(data.map(note => path.basename(note.filePath)).includes(deletedFilename)).toBe(false);

    await database.deleteNotes(notesDir);
  });

  it('delete notes 2', async () => {
    // Insert test notes into database
    await database.upsertNotes(notesDir, testFilePaths, testFiles.map(value => value.content), Array(testFiles.length).fill('user'));

    // Delete individual note
    const deletedFilename = testFilePaths[1];
    await database.deleteNotes(notesDir, deletedFilename);
    
    // Ensure note is deleted
    const data = await database.queryNotes(notesDir);
    expect(data.map(note => path.basename(note.filePath)).includes(deletedFilename)).toBe(false);

    await database.deleteNotes(notesDir);
  });

  it('delete all notes', async () => {
    // Insert test notes into database
    await database.upsertNotes(notesDir, testFilePaths, testFiles.map(value => value.content), Array(testFiles.length).fill('user'));

    // Delete all notes
    await database.deleteNotes(notesDir);
    
    // Ensure all notes are deleted
    const data = await database.queryNotes(notesDir);
    expect(data.length).toBe(0);

    await database.deleteNotes(notesDir);
  });
});