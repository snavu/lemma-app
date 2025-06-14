import express from 'express';
import { inferenceService } from './main';
import * as fileService from './file-service';
import * as graphLoader from './graph-loader';
import * as path from 'path';
import { viewMode } from '../shared/types';
import { database } from './main';
import { FileType } from './database';
import * as userAgiSync from './agi-sync';

const apiApp = express();
apiApp.use(express.json({ limit: '100mb' }));

const limit = 5000;
// Truncate web page content longer than 10000 characters
const truncateLongString = (str: string): string => {
  // Get first 5000 words and last 5000 words
  if (str.length > 2 * limit) {
    const head = str.slice(0, limit);
    const tail = str.slice(-limit);
    return `${head}\n\n... [truncated ${str.length - 2 * limit} characters] ...\n\n${tail}`;
  } else {
    return str;
  }
}

// 1. Respond to queries about web content
apiApp.post('/api/chat', async (req, res) => {
  const { webContent, query, prevMessages, url } = req.body;
  console.log('Received query from extension:', { query, url });

  try {
    // Prepare the message history for the LLM
    const messageHistory = [];
    
    // Add previous messages if they exist
    if (prevMessages && Array.isArray(prevMessages)) {
      for (const msg of prevMessages.slice(0, prevMessages.length - 1)) {
        messageHistory.push({
          role: msg.role,
          content: msg.content || msg
        });
      }
    }
    
    // Create a context-aware prompt that includes the web content
    const contextPrompt = `
Context: I'm browsing a webpage with the following content:

URL: ${url}

Web Content:
${truncateLongString(webContent)}

Please provide a helpful response based on the web content and the user's question.

User Question: ${query}`;

    // Add the current query with context
    messageHistory.push({
      role: 'user',
      content: contextPrompt
    });

    // Call the inference service, writing each token back to the client
    const response = await inferenceService.chatCompletionWebpage(messageHistory, { 
      stream: true,
      temperature: 0.7, 
    }, (token) => {
      res.write(token);
    });

    if (!response.response) {
      res.write('Sorry, I could not generate a response.');
    }

    // Terminate the response
    res.end();
  } catch (error) {
    console.error('Error processing chat request:', error);
    res.status(500).json({
      answer: 'Sorry, there was an error processing your request.',
      error: error.message,
      success: false
    });
    res.end();
  }
});

// 2. Save current webpage as a markdown note (with LLM processing)
apiApp.post('/api/save-note', async (req, res) => {
  const { webContent, title, url } = req.body;
  console.log('Processing and saving note to Lemma:', { title, url, contentLength: webContent?.length });

  try {
    // Validate input
    if (!title) {
      res.status(400).json({
        success: false,
        error: 'Title is required'
      });
      return;
    }

    if (!webContent || webContent.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Web content is required and cannot be empty'
      });
      return;
    }

    // Process content with the dedicated formatting function
    const formatResponse = await inferenceService.formatWebContent(webContent, {
      temperature: 0.2  // Lower temperature for more consistent formatting
    });

    let processedContent = formatResponse.formattedContent;
    
    // Validate LLM response and fallback if needed
    if (!processedContent || processedContent.trim().length === 0) {
      console.log('LLM returned empty response, using original content');
      processedContent = webContent;
    } else {
      console.log('LLM processed content preview:', processedContent.substring(0, 200) + '...');
    }

    // Sanitize the title for use as filename
    const sanitizedTitle = title
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim()
      .substring(0, 100); // Limit length

    // Create filename with .md extension
    const fileName = `${sanitizedTitle}.md`;

    // Create the final note content with metadata
    const noteContent = `# ${title}

**Source:** ${url}
**Saved:** ${new Date().toISOString()}

---

${processedContent}
`;

    // Get the notes directory
    const notesDirectory = fileService.mainNotesDirectory;
    if (!notesDirectory) {
      res.status(500).json({
        success: false,
        error: 'Notes directory not configured'
      });
      return;
    }

    const filePath = path.join(notesDirectory, fileName);

    // Save the file using the existing file service
    const result = await fileService.saveFile(filePath, noteContent, []);
    
    if (result.success) {
      // Update the graph with the new file
      const viewMode: viewMode = 'main';
      await graphLoader.updateFileInGraph(viewMode, fileName);
      // Insert note to vector db
      await database.upsertNotes(notesDirectory, filePath, noteContent, 'main' as FileType);

      // Sync agi
      const syncSuccess = await userAgiSync.updateFileInAgi(fileName);
      if (syncSuccess) {
        console.log('User successfully synced all files with AGI');
      } else {
        console.error('Failed to sync user with AGI');
      }

      res.json({
        success: true,
        fileName: fileName,
        filePath: filePath,
        message: 'Note processed and saved successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to save note'
      });
    }

  } catch (error) {
    console.error('Error processing and saving note:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

export function startExtensionService(port: number) {
  apiApp.listen(port, () => {
    console.log(`Extension service running at http://localhost:${port}`);
  });
}
