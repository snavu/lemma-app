import { Ollama } from "ollama";
import * as path from 'path';

export class EvalInferenceService {
  private ollamaClient: Ollama;
  private localModel: string = "llama3.2";
  private localPort: number = 11434;

  constructor() {
    this.ollamaClient = new Ollama({
      host: `http://127.0.0.1:${this.localPort}`,
    });
  }

  /**
   * Determines if the generated response is derived from the given context
   */
  async evaluateFaithfulness(input: string, output: string, contexts: any[]): Promise<{ reason: string | null, score: number }> {
    try {
      const prompt = `
You are an expert in evaluating faithfulness of a generated response. Given an user query, a set of context, and a generated reponse, determine if the response is supported from the given context with a score between 0 and 1.

Criteria for evaluation:
- Check whether the facts in the generated response matches with the facts contained in the set of context.
- You should heavily penalize any factual information (but not examples) in the generated response that is not included in the given context.
- It is okay for the generated response to disregard some contextual information that are not relevant to the user's query.
- When scoring, do not take into account the factual accuracy of the context or response; just focus on the factual consistency of the response with the retrieved context.
- Also, do not evaluate based on the relevancy of the generated response and the user's query.
- Generated responses may contain rephrasing or direct copies of the retrieve context, and should not be penalized.

Output Format
Return a JSON object that contains the following properties in order:
1. A 'reason' field of type string that explains your reasoning for the faithfulness score. 
2. A 'score' field of type float between 0 and 1 that represents the faithfulness score of the generated response.

The JSON structure should be:
{
  "reason": "Reasoning for for the faithfulness score",
  "score": "Faithfulness score of the generated response"
}
`;
      const messages = [
        { role: "system", content: prompt },
      ];

      // Append user query to prompt
      let aggregatedPrompt = `User query: ${input}\n
Here is the retrieved context:\n`;
      for (const [i, context] of contexts.entries()) {
        // Append context to prompt
        aggregatedPrompt += `Document title: ${path.basename(context.filePath)}
Context:
${context}\n
----------------------
`;
      }
      // Append generated response to the prompt
      aggregatedPrompt += `Generated response: ${output}`;

      messages.push({ role: "user", content: aggregatedPrompt });
      messages.push({ role: "assistant", content: '' });

      // Request JSON format output from Ollama
      const response = await this.ollamaClient.chat({
        model: this.localModel,
        messages: messages,
        format: "json",
        options: {
          temperature: 0.2
        }
      });

      const responseContent = response.message?.content || '';

      try {
        // Parse response string to JSON
        const contentObj = JSON.parse(responseContent);
        // Ensure type is number for the score
        contentObj.score = Number(contentObj.score);
        return contentObj;
      } catch (error) {
        console.error('Failed to parse LLM response as JSON', error);
        console.log('Raw response:', responseContent);
        return { reason: null, score: NaN };
      }
    } catch (error) {
      console.error('Error in evaluation:', error);
      return { reason: null, score: NaN };
    }
  }
}