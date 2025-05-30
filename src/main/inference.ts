import OpenAI from "openai";
import { config } from "./main";
import { llmConfig} from 'src/shared/types';
import { Ollama } from "ollama";
import { DbClient, FileType } from "./database";
import * as fileService from './file-service';

// State for LLM generation
let isStreaming: boolean = false;
export const startStreaming = (): void => { isStreaming = true };
export const stopStreaming = (): void => { isStreaming = false };
export const streamingState = (): boolean => { return isStreaming };

/**
 * Inference service supporting both cloud provider calls and local inference with Ollama
 */
export class InferenceService {
  private client: OpenAI | null;
  private ollamaClient: Ollama | null;
  private localPort: number = 11434; // Default port for Ollama server
  private isLocalMode: boolean;
  private localModel: string = "llama3.2"; // Default model
  private agiDatabase: DbClient;

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
    this.isLocalMode = config.getLocalInferenceConfig().enabled;

    if (!this.isLocalMode) {
      // Cloud mode - initialize OpenAI client
      this.client = new OpenAI({
        baseURL: llmConfig.endpoint || 'https://api.deepseek.com',
        apiKey: llmConfig.apiKey,
      });
      this.ollamaClient = null;
    } else {
      // Local mode - initialize Ollama client
      this.client = null;
      this.initializeOllamaClient();
    }

    // Initialize database connection
    this.agiDatabase = new DbClient('agi-notes');
  }

  /**
   * Initialize the Ollama client
   */
  private async initializeOllamaClient() {
    try {
      // Get local model configuration if available
      const localConfig = config.getLocalInferenceConfig();
      if (localConfig.model) {
        this.localModel = localConfig.model;
      }
      if (localConfig.port) {
        this.localPort = localConfig.port;
      }

      this.ollamaClient = new Ollama({
        host: `http://127.0.0.1:${this.localPort}`,
      });


      console.log(`Initialized Ollama client with model: ${this.localModel} on port: ${this.localPort}`);

    }
    catch (error) {
      console.error('Failed to initialize Ollama client:', error);
      this.ollamaClient = null;
    }
  }

  /**
   * Format web content into clean markdown
   * Specifically designed for processing webpage content into structured notes
   * 
   * @param webContent - Raw web content to format
   * @param options - Additional options for formatting
   */
  async formatWebContent(webContent: string, options: any = {}) {
    const localModel = config.getLocalInferenceConfig().model;
    this.localModel = localModel ? localModel : this.localModel;
    
    try {
      const formatPrompt = `Convert the following web content into clean, well-structured markdown. DO NOT add commentary, explanations, or responses. ONLY return the formatted content.

Rules:
- Use proper markdown headings (# ## ###) for structure
- Create organized bullet points and numbered lists
- Use **bold** and *italic* for emphasis where appropriate
- Remove navigation menus, ads, sidebars, and irrelevant content
- Keep the main content and important information
- Preserve code blocks, quotes, and data tables if present
- Ensure the output is clean and readable
- Do not add introductory text or conclusions

Web content to format:
${webContent}

Return only the formatted markdown:`;

             const messages: Array<{role: "system" | "user" | "assistant", content: string}> = [
         { role: "system", content: "You are a content formatting specialist. Format the provided content into clean markdown without adding any commentary." },
         { role: "user", content: formatPrompt }
       ];

      if (this.isLocalMode) {
        // Local inference using Ollama
        if (!this.ollamaClient) {
          this.initializeOllamaClient();
          if (!this.ollamaClient) {
            console.error('Ollama client initialization failed');
            return { formattedContent: webContent }; // Fallback to original
          }
        }

        const response = await this.ollamaClient.chat({
          model: this.localModel,
          messages: messages,
          options: {
            temperature: options.temperature || 0.2 // Lower temperature for consistent formatting
          }
        });

        return {
          formattedContent: response.message?.content || webContent
        };
      } else {
        // Cloud inference using OpenAI SDK
        const modelName = options.model || config.getLLMConfig().model;

        const response = await this.client!.chat.completions.create({
          model: modelName,
          messages: messages,
          temperature: options.temperature || 0.2, // Lower temperature for consistent formatting
          max_tokens: options.max_tokens
        });

        return {
          formattedContent: response.choices[0]?.message.content || webContent
        };
      }
    } catch (error) {
      console.error('Error in web content formatting:', error);
      return { formattedContent: webContent }; // Fallback to original content
    }
  }

  /**
   * Send a chat completion request to chunk the document
   * Works with both cloud and local inference
   */
  async getChunks(content: string, filename: string) {
    const localModel = config.getLocalInferenceConfig().model;
    this.localModel = localModel ? localModel : this.localModel;
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
- Only return the JSON object with the chunks, do not include any additional text or explanations

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
        // Local inference using Ollama
        if (!this.ollamaClient) {
          this.initializeOllamaClient();
          if (!this.ollamaClient) {
            console.error('Ollama client initialization failed');
            return { chunks: [] };
          }
        }

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
  async chatCompletion(messageHistory: any[], options: any = {}, onToken?: (token: string) => void) {
    const localModel = config.getLocalInferenceConfig().model;
    this.localModel = localModel ? localModel : this.localModel;
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
        ...messageHistory,
        { role: "assistant", content: "" }
      ];
      
      const userPrompt = messages[messages.length-2].content;
      const contextArr = await this.agiDatabase.queryNotes(
        fileService.generatedDirectory,
        { searchQuery: userPrompt, searchMode: 'similarity', limit: 5 }
      );

      let aggregatedPrompt = '';
      for (const [i, context] of contextArr.entries()) {
        // Append context to the user prompt
        aggregatedPrompt += `File ${i+1}: ${context.filePath}\nContext: ${context.content}\n\n`;
      }
      // Append user's query to the prompt
      aggregatedPrompt += `User's query: ${userPrompt}`;
      messages[messages.length-2].content = aggregatedPrompt;

      console.log(messages[messages.length-2]); // Debugging
      // console.log(messageHistory);

      if (this.isLocalMode) {
        // Local inference using Ollama
        if (!this.ollamaClient) {
          this.initializeOllamaClient();
          if (!this.ollamaClient) {
            console.error('Ollama client initialization failed');
            return { response: '' };
          }
        }
        console.log('inferencing on local');

        // Handle streaming if requested
        if (options.stream) {
          let fullResponse = '';

          const stream = await this.ollamaClient.chat({
            model: this.localModel,
            messages: messages,
            stream: true,
            options: {
              temperature: options.temperature || 0.7
            }
          });

          // Stream token by token
          for await (const chunk of stream) {
            // If streaming interrupted, break
            if (!streamingState()) {
              console.log('generating canceled');
              break;
            }
            const token = chunk?.message?.content;
            if (token) {
              fullResponse += token; // Append token to response
              onToken(token); // Invoke callback function
            }
          }

          return { response: fullResponse };
        }

        // Non-streaming response
        const response = await this.ollamaClient.chat({
          model: this.localModel,
          messages: messages,
          options: {
            temperature: options.temperature || 0.7
          }
        });

        return {
          response: response.message?.content || ''
        };
      } else {
        // Cloud inference using OpenAI SDK - simple pass-through
        const modelName = options.model || config.getLLMConfig().model;
        console.log('inferencing on cloud');

        // Handle streaming if requested
        if (options.stream) {
          let fullResponse = '';

          const stream = await this.client!.chat.completions.create({
            model: modelName,
            messages: messages,
            stream: true,
            temperature: options.temperature || 0.7,
            max_tokens: options.max_tokens
          });

          // Stream token by token
          for await (const chunk of stream) {
            // If streaming interrupted, break
            if (!streamingState()) {
              console.log('generating canceled');
              break;
            }
            const token = chunk.choices[0]?.delta?.content;
            if (token) {
              fullResponse += token; // Append token to response
              onToken(token); // Invoke callback function
            }
          }

          return { response: fullResponse };
        }

        // Non-streaming response
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
    const localConfig = config.getLocalInferenceConfig();

    // Update local mode status based on the config service
    this.isLocalMode = localConfig.enabled;

    if (!this.isLocalMode) {
      // Cloud mode - initialize or update OpenAI client
      this.client = new OpenAI({
        baseURL: newConfig.endpoint || 'https://api.deepseek.com',
        apiKey: newConfig.apiKey,
      });

      // If switching from local to cloud, clean up local client
      if (usingLocalBefore) {
        this.ollamaClient = null;
      }
    } else if (!usingLocalBefore) {
      // Switching from cloud to local - initialize Ollama client
      this.client = null;
      this.initializeOllamaClient();
    }
  }

  /**
   * Check if the service is using local inference
   */
  isUsingLocalInference() {
    return this.isLocalMode;
  }

  /**
   * Check if the service is ready (either client configured or Ollama initialized)
   */
  isReady() {
    return (this.isLocalMode && this.ollamaClient !== null) ||
      (!this.isLocalMode && this.client !== null);
  }
}