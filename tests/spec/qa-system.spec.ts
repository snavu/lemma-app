import * as fileService from '../../src/main/file-service';
import { InferenceService, startStreaming, stopStreaming } from '../../src/main/inference';
import { EvalInferenceService } from '../helpers/eval-inference';
const { DbClient } = require('../../src/main/database');
const main = require('../../src/main/main');
import * as userAgiSync from '../../src/main/agi-sync';
import * as fs from 'fs';
import * as path from 'path';

const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'qa-system');
const logPath = path.join(process.cwd(), 'tests', 'logs');
if (!fs.existsSync(logPath)) fs.mkdirSync(logPath);

fileService.MainNotesDirectory(fixturePath);

// Spy on database
const dbSpy = jest.spyOn(DbClient.prototype, 'queryNotes');

// Initialize inference service from main
const testInferenceService = new InferenceService();
main.inferenceService = testInferenceService;

// Initialize inference service for evaluation
const evalInferenceService = new EvalInferenceService();
const testQuries = [
    'What are the four properties of mutual exclusion?',
    'What happens in a deadlock?',
    'What is the pseudocode of the Bakery Algorithm?',
    'What does a semphore have?'
];
const evaluationScores: number[] = [];

const chatResponse = async (query: string) => {
  const result = await main.inferenceService.chatCompletion(
    [{ role: 'user', content: query }],
    { stream: true }
  );

  return result;
};

describe('Set up files', () => {
  it('chunk and embed files', async () => {
    // Sync files to AGI
    const success = await userAgiSync.syncAgi();

    const files = fs.readdirSync(path.join(fixturePath, 'LEMMA_generated'));
    console.log(files);

    expect(success).toBe(true);
    // console.log(await inference.getChunks('hello world!', 'test.md'));
  });
});

describe('chatCompletion()', () => {
  for (const [i, userQuery] of testQuries.entries()) {
    it(`question and answer ${i+1}`, async () => {
      // Send a query to the inference model
      const result = await chatResponse(userQuery);

      expect(result.response).not.toBeUndefined();
      expect(result.response.length).toBeGreaterThan(0);

      // Inference service executed semantic search over the vector database
      expect(dbSpy).toHaveBeenCalled();
      // Get retrieved context from spy
      const contextData = await dbSpy.mock.results[0].value;

      // Evaluate response by checking if response is consistent with retrieved context
      const evaluation = await evalInferenceService.evaluateFaithfulness(userQuery, result.response, contextData);
      console.log(evaluation.score, evaluation.reason);

      // Log test data
      const fileOut = { query: userQuery, context: contextData.map((data: any) => data.content), response: result.response, evaluation: evaluation };
      fs.writeFileSync(path.join(logPath, `eval${i+1}.json`), JSON.stringify(fileOut, null, 2));

      evaluationScores.push(evaluation.score);

      dbSpy.mockClear();
    });
  }

  it('responses consistent with retrieved context', () => {
    // Take average score
    const avgEvalScore = evaluationScores.reduce((acc, val) => acc + val, 0) / evaluationScores.length;
    expect(avgEvalScore).toBeGreaterThanOrEqual(0.5);
  });
});