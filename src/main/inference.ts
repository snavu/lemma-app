import OpenAI from "openai";
import { config } from "./main";
import { llmConfig } from "./config-service";
/**
 * Simple inference service using OpenAI SDK
 */
export class InferenceService {
  private client: OpenAI;

  /**
   * Constructor
   */
  constructor() {
    const llmConfig: llmConfig = config.getLLMConfig() || {
      endpoint: '',
      apiKey: '',
      model: ''
    };

    this.client = new OpenAI({
      baseURL: llmConfig.endpoint || 'https://api.deepseek.com',
      apiKey: llmConfig.apiKey,
    });
  }

  /**
   * Send a chat completion request
   */
  async getChunks(content: string, filename: string) {
    try {
      // Create the prompt for the LLM
      const prompt = `
You are an expert in knowledge management and information chunking. Your task is to divide the following note into semantically meaningful, self-contained chunks of information.

# Guidelines for Chunking
- Each chunk should contain complete, self-contained information that can be understood on its own
- Preserve the hierarchical structure and context when creating chunks
- Keep related concepts together in the same chunk
- Each chunk should have a clear, descriptive title
- Include necessary context from parent sections
- Ensure chunks follow natural semantic boundaries in the content
- Handle formatting elements like bullet points, code blocks, and tables appropriately

# Document Title: ${filename.replace(/\.md$/, '')}

# Document Content:
${content}

# Output Format
Return a JSON object with an array of chunks, where each chunk has:
1. A 'title' field with a descriptive title
2. A 'content' field with the complete content for that chunk, including any necessary markdown formatting and context headers

The JSON structure should be:
{
  "chunks": [
    {
      "title": "Descriptive Title for Chunk 1",
      "content": "Complete markdown content for chunk 1, including headers and context"
    },
    {
      "title": "Descriptive Title for Chunk 2",
      "content": "Complete markdown content for chunk 2, including headers and context"
    }
  ]
}
`;

      // Get the model from config or use a default
      const modelName = config.getLLMConfig().model;

      // Call the chat completions API
      const response = await this.client.chat.completions.create({
        model: modelName,
        messages: [
          { role: "system", content: "You are an AI assistant that specializes in semantic document chunking." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      });

      // Parse the response content
      const responseContent = response.choices[0]?.message.content || "";

      try {
        return JSON.parse(responseContent);
      } catch (error) {
        console.error('Failed to parse LLM response as JSON', error);
        console.log('Raw response:', responseContent);
        return { chunks: [] };
      }
    } catch (error) {
      console.error('Error calling LLM for chunking:', error);
      return { chunks: [] };
    }
  }

  /**
   * Update client configuration
   */
  updateConfig(newConfig: llmConfig) {
    this.client = new OpenAI({
      baseURL: newConfig.endpoint || this.client.baseURL,
      apiKey: newConfig.apiKey || this.client.apiKey,
    });
  }
}
