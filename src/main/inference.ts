import OpenAI from "openai";
import { config } from "./main";
import { llmConfig } from "./config-service";
const { pipeline } = require("@huggingface/transformers");
/**
 * Inference service supporting both cloud provider calls and local inference
 */
export class InferenceService {
  private client: OpenAI | null;
  private localPipeline: any | null;
  private isLocalMode: boolean;
  private isLoadingPipeline: boolean = false;

  /**
   * Constructor
   */
  constructor() {
    const llmConfig: llmConfig = config.getLLMConfig() || {
      endpoint: '',
      apiKey: '',
      model: ''
    };

    // Determine if we should use local mode
    this.isLocalMode = !llmConfig.apiKey || llmConfig.apiKey.trim() === '';

    console.log("Local mode? ", this.isLocalMode);
    if (!this.isLocalMode) {
      // Cloud mode - initialize OpenAI client
      this.client = new OpenAI({
        baseURL: llmConfig.endpoint || 'https://api.deepseek.com',
        apiKey: llmConfig.apiKey,
      });
      this.localPipeline = null;
    } else {
      // Local mode - initialize transformers.js pipeline
      this.client = null;
      console.log('Loading transformers.js pipeline...1');
      this.initializeLocalPipeline();
    }
  }

  /**
   * Initialize the local pipeline for transformers.js
   */
  private async initializeLocalPipeline() {

    console.log("this.localPipeline", this.localPipeline);
    console.log("this.isLoadingPipeline", this.isLoadingPipeline);
    if (this.localPipeline !== undefined || this.isLoadingPipeline) {
      return;
    }

    this.isLoadingPipeline = true;
    try {
      // Dynamically import transformers to avoid bundling issues
      if (!this.localPipeline) {
        //let { pipeline } = await import('@huggingface/transformers');
        console.log('Loading transformers.js pipeline...2');
        // Initialize the text-generation pipeline with a suitable model
        this.localPipeline = await pipeline('text-generation', "onnx-community/Qwen2.5-0.5B-Instruct", { dtype: "q4" },
        );
        console.log('Local inference pipeline initialized successfully');
        const messageHistory = [{ role: "user", content: "tell me about type theory" }];
        const response = await this.chatCompletion(messageHistory);
        console.log("inferenceService.chatCompletion: ", response);
        
      }
    }
    catch (error) {
      console.error('Failed to initialize local inference pipeline:', error);
      this.localPipeline = null;
    }
  }

  /**
   * Send a chat completion request to chunk the document
   * Works with both cloud and local inference
   */
  async getChunks(content: string, filename: string) {
    try {
      // Create the prompt for the model
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

      const messages = [
        { role: "system", content: "You are an AI assistant that specializes in semantic document chunking." },
        { role: "user", content: prompt }
      ];

      if (this.isLocalMode) {
        // Local inference using transformers.js
        if (!this.localPipeline) {
          await this.initializeLocalPipeline();
          if (!this.localPipeline) {
            console.error('Local pipeline initialization failed');
            return { chunks: [] };
          }
        }

        const response = await this.localPipeline(
          messages, {
          max_length: 2048,
          temperature: 0.2
        });

        const responseContent = response[0]?.generated_text || '';

        try {
          return JSON.parse(responseContent);
        } catch (error) {
          console.error('Failed to parse LLM response as JSON', error);
          console.log('Raw response:', responseContent);
          return { chunks: [] };
        }
      } else {
        // Cloud inference using OpenAI SDK
        const modelName = config.getLLMConfig().model;

        const response = await this.client!.chat.completions.create({
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
      }
    } catch (error) {
      console.error('Error in document chunking:', error);
      return { chunks: [] };
    }
  }

  /**
   * Send a chat completion for Q&A
   * Works with both cloud and local inference
   * Accepts standard message format:
   * 
   * @param messageHistory - Array of message objects with 'role' and 'content'. The user should be the last role.
   * @param options - Additional options for the request
   */
  async chatCompletion(messageHistory: any[], options: any = {}) {
    try {
      const prompt = `
      You are a helpful assistant that provides accurate, concise, and relevant answers based on the given context. 
      When answering questions:
      - Focus on directly addressing the user's query
      - Provide accurate information based on the context provided
      - If uncertain, acknowledge limitations rather than making up information
      - Use clear and concise language
      - Format code, lists, and technical content appropriately
      - When asked about code, include working examples when appropriate
      `;

      const messages = [
        { role: "system", content: "You are an AI assistant that specializes in question answering." },
        { role: "user", content: prompt },
        { role: "assistant", content: "Please provide the context for your question." },
        ...messageHistory
      ];

      if (this.isLocalMode) {
        // Local inference using transformers.js
        if (!this.localPipeline) {
          await this.initializeLocalPipeline();
          if (!this.localPipeline) {
            console.error('Local pipeline initialization failed');
            return { response: '' };
          }
        }

        const response = await this.localPipeline(messages, {
          max_length: options.max_tokens || 1024,
          temperature: options.temperature || 0.7
        });

        return {
          response: response[0]?.generated_text || ''
        };
      } else {
        // Cloud inference using OpenAI SDK - simple pass-through
        const modelName = options.model || config.getLLMConfig().model;

        const response = await this.client!.chat.completions.create({
          model: modelName,
          messages: messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens
        });

        return {
          response: response.choices[0]?.message.content || ''
        };
      }
    } catch (error) {
      console.error('Error in chat completion:', error);
      return { response: '' };
    }
  }

  /**
   * Update client configuration
   */
  updateConfig(newConfig: llmConfig) {
    const usingLocalBefore = this.isLocalMode;

    // Determine if we should use local mode with the new config
    this.isLocalMode = !newConfig.apiKey || newConfig.apiKey.trim() === '';

    if (!this.isLocalMode) {
      // Cloud mode - initialize or update OpenAI client
      this.client = new OpenAI({
        baseURL: newConfig.endpoint || 'https://api.deepseek.com',
        apiKey: newConfig.apiKey,
      });

      // If switching from local to cloud, clean up local pipeline
      if (usingLocalBefore) {
        this.localPipeline = null;
      }
    } else if (!usingLocalBefore) {
      // Switching from cloud to local - initialize local pipeline
      this.client = null;
      this.initializeLocalPipeline();
    }
  }

  /**
   * Check if the service is using local inference
   */
  isUsingLocalInference() {
    return this.isLocalMode;
  }

  /**
   * Check if the service is ready (either client configured or pipeline initialized)
   */
  isReady() {
    return (this.isLocalMode && this.localPipeline !== null) ||
      (!this.isLocalMode && this.client !== null);
  }
}