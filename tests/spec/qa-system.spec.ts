import * as fileService from '../../src/main/file-service';
import { InferenceService, startStreaming, stopStreaming } from '../../src/main/inference';
const { DbClient } = require('../../src/main/database');
import { Config } from '../../src/main/config-service';
const main = require('../../src/main/main');
import * as userAgiSync from '../../src/main/agi-sync';
import * as fs from 'fs';
import * as path from 'path';

const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'qa-system');
const evalPath = path.join(process.cwd(), 'tests', 'fixtures', 'evaluation');
const helpersPath = path.join(process.cwd(), 'tests', 'helpers');
// const configPath = path.join(process.cwd(), 'tests', 'fixtures', 'config');

fs.mkdirSync(fixturePath, { recursive: true });
fs.mkdirSync(evalPath, { recursive: true });
fileService.MainNotesDirectory(fixturePath);

// Spy on database
const dbSpy = jest.spyOn(DbClient.prototype, 'queryNotes');

// Initialize inference service from main
const testInferenceService = new InferenceService();
main.inferenceService = testInferenceService;

const testData: { question: string[], answer: string[], contexts: string[] } = {
  question: [
    'What are the four properties of mutual exclusion?',
    'What happens in a deadlock?',
    'What is the procedure of the Bakery Algorithm?'
  ],
  answer: [],
  contexts: []
};

const chatResponse = async (query: string) => {
  startStreaming();
  const result = await main.inferenceService.chatCompletion(
    [{ role: 'user', content: query }],
    { stream: true },
    () => {}
  );
  stopStreaming();

  return result;
};

describe('syncAgi()', () => {
  it('sync files to agi', async () => {
    // Sync files to AGI
    const success = await userAgiSync.syncAgi();

    const files = fs.readdirSync(path.join(fixturePath, 'LEMMA_generated'));
    console.log(files);

    expect(success).toBe(true);
    // console.log(await inference.getChunks('hello world!', 'test.md'));
  });
});

describe('chatCompletion()', () => {
  it('question and answer 1', async () => {
    const result = await chatResponse(testData.question[0]);

    expect(dbSpy).toHaveBeenCalled();
    const contextData = await dbSpy.mock.results[0].value;
    testData.contexts.push(contextData.map((data: any) => data.content));
    testData.answer.push(result.response);

    // fs.writeFileSync(path.join(helpersPath, 'evaluation.json'), JSON.stringify(testData, null, 2));
    dbSpy.mockClear();
  });

  it('question and answer 2', async () => {
    const result = await chatResponse(testData.question[1]);

    expect(dbSpy).toHaveBeenCalled();
    const contextData = await dbSpy.mock.results[0].value;
    testData.contexts.push(contextData.map((data: any) => data.content));
    testData.answer.push(result.response);

    // fs.writeFileSync(path.join(helpersPath, 'evaluation.json'), JSON.stringify(testData, null, 2));
    dbSpy.mockClear();
  });

  it('question and answer 3', async () => {
    const result = await chatResponse(testData.question[2]);

    expect(dbSpy).toHaveBeenCalled();
    const contextData = await dbSpy.mock.results[0].value;
    testData.contexts.push(contextData.map((data: any) => data.content));
    testData.answer.push(result.response);

    // fs.writeFileSync(path.join(helpersPath, 'evaluation.json'), JSON.stringify(testData, null, 2));
    dbSpy.mockClear();
  });
});