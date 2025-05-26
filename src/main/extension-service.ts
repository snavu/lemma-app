import express from 'express';
import { inferenceService } from './main';
import * as fileService from './file-service';
import * as graphLoader from './graph-loader';
import * as path from 'path';

const apiApp = express();
apiApp.use(express.json());

apiApp.post('/api/chat', async (req, res) => {
  const { webContent, query, prevMessages, url } = req.body;
  console.log('Received query from extension:', { webContent, query, prevMessages, url });

  try {
    // Prepare the message history for the LLM
    const messageHistory = [];
    
    // Add previous messages if they exist
    if (prevMessages && Array.isArray(prevMessages)) {
      for (const msg of prevMessages) {
        messageHistory.push({
          role: msg.role || 'user',
          content: msg.content || msg
        });
      }
    }
    
    // Create a context-aware prompt that includes the web content
    const contextPrompt = `
Context: I'm browsing a webpage with the following content:

URL: ${url}

Web Content:
${webContent}

User Question: ${query}

Please provide a helpful response based on the web content and the user's question.`;

    // Add the current query with context
    messageHistory.push({
      role: 'user',
      content: contextPrompt
    });

    // Call the inference service
    const response = await inferenceService.chatCompletion(messageHistory, { 
      stream: false,
      temperature: 0.7 
    });

    // Return the AI response
    res.json({
      answer: response.response || 'Sorry, I could not generate a response.',
      url: url,
      success: true
    });

  } catch (error) {
    console.error('Error processing chat request:', error);
    res.status(500).json({
      answer: 'Sorry, there was an error processing your request.',
      error: error.message,
      success: false
    });
  }
});

apiApp.post('/api/save-note', async (req, res) => {
  const { webContent, title, URL } = req.body;
  console.log('Saving note to Lemma:', { title, URL, contentLength: webContent?.length });

  try {
    // Validate input
    if (!title || !webContent) {
      res.status(400).json({
        success: false,
        error: 'Title and content are required'
      });
      return;
    }

    // Sanitize the title for use as filename
    const sanitizedTitle = title
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim()
      .substring(0, 100); // Limit length

    // Create filename with .md extension
    const fileName = `${sanitizedTitle}.md`;

    // Create the note content with metadata
    const noteContent = `# ${title}

**Source:** ${URL}
**Saved:** ${new Date().toISOString()}

---

${webContent}
`;

    // Get the full file path
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
      const viewMode = 'main';
      await graphLoader.updateFileInGraph(viewMode, fileName);
      
      // Note: Database update skipped due to embedding dimension mismatch

      res.json({
        success: true,
        fileName: fileName,
        filePath: filePath,
        message: 'Note saved successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to save note'
      });
    }

  } catch (error) {
    console.error('Error saving note:', error);
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
