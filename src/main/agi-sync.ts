import * as fs from 'fs';
import * as path from 'path';
import * as fileService from './file-service';
import * as graphService from './graph-service';
import { inferenceService } from './main';
import { config } from './main';
// import { c } from 'vite/dist/node/moduleRunnerTransport.d-CXw_Ws6P';
import { viewMode } from 'src/shared/types';
import { throttle } from 'lodash'; 

import { BrowserWindow } from 'electron';
import { DbClient, FileType } from './database';

const agiDatabase = new DbClient('agi-notes');

// Helper function to send events to all renderer processes
export const notifyGraphRefresh = throttle(() => {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send('graph-refresh');
    }
  }
}, 300, { leading: true, trailing: true });

// Helper function to send events to all renderer processes
export const notifyFilesRefresh = throttle(() => {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send('generated-files-refresh');
    }
  }
}, 300, { leading: true, trailing: true });

/**
 * Updates a parent note with links to all its chunk files
 */
const updateParentWithChunkLinks = async (parentFilename: string, chunkFilenames: string[]): Promise<boolean> => {
  try {
    // Get directories
    const notesDir = config.getMainNotesDirectory();
    const generatedDir = fileService.getGeneratedFolderPath();

    if (!notesDir || !generatedDir) {
      console.error('Directories not set');
      return false;
    }

    // Path to parent file in the generated directory
    const parentPath = path.join(generatedDir, parentFilename);

    if (!fs.existsSync(parentPath)) {
      console.error(`Parent file not found in generated directory: ${parentFilename}`);
      return false;
    }

    // Read the current content
    let content = fs.readFileSync(parentPath, 'utf8');

    // Remove any existing chunk links section
    content = content.replace(/\n\n## Chunks\n([\s\S]*?)(\n\n|$)/, '\n\n');

    // Format the chunks section
    let chunksSection = '\n\n## Chunks\n';
    for (const chunkFilename of chunkFilenames) {
      // Extract chunk number from filename
      const chunkMatch = chunkFilename.match(/_chunk(\d+)\.md$/);
      const chunkNum = chunkMatch ? chunkMatch[1] : '?';

      // Format as a link without the .md extension
      const linkName = chunkFilename.replace('.md', '');
      chunksSection += `- [[${linkName}]] (Chunk ${chunkNum})\n`;
    }

    // Append the chunks section to the content
    content += chunksSection;

    // Write the updated content back to the file
    fs.writeFileSync(parentPath, content);

    // Update the node in the graph to include links to all chunks
    const linkedFiles = graphService.parseFileLinks(content, [...chunkFilenames, parentFilename]);
    createNodeInAgiGraph(parentFilename, linkedFiles, 'assisted');

    return true;
  } catch (error) {
    console.error(`Error updating parent with chunk links: ${error}`);
    return false;
  }
};

/**
 * Process the content of a file to extract linked files
 */
const parseFileLinks = (content: string, availableFiles: string[]): string[] => {
  return graphService.parseFileLinks(content, availableFiles);
};

/**
 * Cleans up existing chunk files for a note
 */
const cleanupChunkFiles = async (filename: string): Promise<void> => {
  try {
    // Get generated directory
    const generatedDir = fileService.getGeneratedFolderPath();
    if (!generatedDir) {
      console.error('Generated directory not set');
      return;
    }

    const baseFilename = filename.split('.')[0];
    const chunkPrefix = `generated_${baseFilename}_`;

    try {
      const generatedFiles = fs.readdirSync(generatedDir);
      // Keep track of deleted chunks to update graph
      const deletedChunks: string[] = [];

      for (const file of generatedFiles) {
        if (file.startsWith(chunkPrefix) && file.endsWith('.md')) {
          const generatedFilePath = path.join(generatedDir, file);
          fs.unlinkSync(generatedFilePath);
          console.log(`Deleted chunk file: ${file}`);
          deletedChunks.push(file);

          // Also delete the node from AGI graph
          deleteNodeFromAgiGraph(file);

          // Delete each chunk from the database
          await agiDatabase.deleteNotes(generatedDir, generatedFilePath);
        }
      }
    } catch (error) {
      console.error(`Error cleaning up chunk files for ${filename}:`, error);
    }
  } catch (error) {
    console.error(`Error in cleanupChunkFiles: ${error}`);
  }
};


/**
 * Call the LLM API to get semantic chunking recommendations
 */
export const chunk = async (filename: string, content: string, type: string): Promise<boolean> => {
  try {

    const isChunkingEnabled = config.getAgiConfig().enableChunking;

    if(!isChunkingEnabled){
      console.log(`Chunking disabled, skipping file: ${filename}`);
      return false;
    }
    // Mark file as being processed (not synced yet)
    config.setFileSyncState(filename, false);

    // Get generated directory
    const generatedDir = fileService.getGeneratedFolderPath();
    if (!generatedDir) {
      console.error('Generated directory not set');
      return false;
    }

    console.log(`Chunking file: ${filename}, type: ${type}`);

    // Remove the existing chunks section if present
    let cleanedContent = content;
    const chunksHeader = "## Chunks";
    const chunksIndex = content.indexOf(chunksHeader);
    if (chunksIndex !== -1) {
      cleanedContent = content.substring(0, chunksIndex).trim();
    }

    // Call LLM to determine logical chunks
    const chunkResults = await inferenceService.getChunks(cleanedContent, filename);

    if (!chunkResults || !chunkResults.chunks || chunkResults.chunks.length === 0) {
      console.error('Failed to get chunk recommendations from LLM');
      // Keep file marked as unsynced
      return false;
    }
    else if (chunkResults.canceled) {
      return true;
    }

    // Create files for each chunk
    const chunkFilenames: string[] = [];
    for (let i = 0; i < chunkResults.chunks.length; i++) {
      const chunk = chunkResults.chunks[i];

      // Create a safe filename
      const baseFilename = filename.split('.')[0];
      const safeTitle = chunk.title
        .replace(/[^\w\s]/g, '') // Remove special chars
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .substring(0, 30); // Limit length

      const chunkFilename = `generated_${baseFilename}_${safeTitle}_chunk${i + 1}.md`;
      const chunkPath = path.join(generatedDir, chunkFilename);

      // Create chunk content with metadata
      const chunkContent = `${chunk.content}` + ` \n\n## Linked Notes\n[[${filename.replace('.md', '')}]]`;

      // Write the chunk file
      fs.writeFileSync(chunkPath, chunkContent);
      notifyFilesRefresh();

      // Insert chunk into database
      await agiDatabase.upsertNotes(generatedDir, chunkPath, chunk.content, type as FileType);

      createNodeInAgiGraph(chunkFilename, [], 'assisted');

      // Track this chunk filename
      chunkFilenames.push(chunkFilename);
    }

    for (let i = 0; i < chunkResults.chunks.length; i++) {
      const chunk = chunkResults.chunks[i];
      // Extract linked references to add to graph
      const availableFiles = [...chunkFilenames, filename];
      const chunkContent = `${chunk.content}` + ` \n\n## Linked Notes\n[[${filename.replace('.md', '')}]]`;
      const linkedFiles = parseFileLinks(chunkContent, availableFiles);

      // Add to graph
      createNodeInAgiGraph(chunkFilenames[i], linkedFiles, 'assisted');
    }

    // Update the parent note with links to all chunks
    if (chunkFilenames.length > 0) {
      await updateParentWithChunkLinks(filename, chunkFilenames);
    }

    // Mark file as successfully synced
    config.setFileSyncState(filename, true);

    return true;
  } catch (error) {
    console.error('Error chunking file:', error);
    // Keep file marked as unsynced so it can be retried
    config.setFileSyncState(filename, false);
    return false;
  }
};

/**
 * Copy a file from user notes to AGI notes directory
 */
const copyFileToAgi = async (filename: string): Promise<boolean> => {
  try {
    const notesDir = config.getMainNotesDirectory();
    console.log('copyFileToAgi:', notesDir);
    if (!notesDir) {
      console.error('Notes directory not set');
      return false;
    }

    const generatedDir = fileService.getGeneratedFolderPath();
    if (!generatedDir) {
      console.error('Generated directory not set');
      return false;
    }

    const sourcePath = path.join(notesDir, filename);
    const destPath = path.join(generatedDir, filename);

    // Read the source file
    const content = fileService.readFile(sourcePath);

    // Write to the destination file
    fs.writeFileSync(destPath, content);
    notifyFilesRefresh();
    
    return true;
  } catch (error) {
    console.error(`Error copying file ${filename} to AGI directory: `, error);
    return false;
  }
};

/**
 * Create or update a node in the AGI graph
 */
export const createNodeInAgiGraph = (filename: string, linkedFiles: string[], type: string): boolean => {
  try {
    // Get path to the AGI graph.json
    const agiGraphPath = fileService.getGeneratedGraphJsonPath();
    if (!agiGraphPath) {
      console.error('AGI graph path not set');
      return false;
    }

    // Read the AGI graph.json
    let graphData: { nodes: any[], links: any[] };
    try {
      const data = fs.readFileSync(agiGraphPath, 'utf8');
      graphData = JSON.parse(data);
    } catch (error) {
      console.error('Error reading AGI graph.json:', error);
      // Initialize empty graph if file doesn't exist or is invalid
      graphData = { nodes: [], links: [] };
    }

    // Check if node already exists
    const existingNode = graphData.nodes.find(node => node.name === filename);
    if (existingNode) {
      // Update existing node's links
      return updateLinksInAgiGraph(existingNode.id, linkedFiles, type);
    }

    // Calculate new node ID
    const newId = graphData.nodes.length > 0
      ? Math.max(...graphData.nodes.map(node => node.id)) + 1
      : 0;

    // Create new node
    const newNode = {
      id: newId,
      name: filename,
      type: type
    };

    // Add node to graph
    graphData.nodes.push(newNode);
    notifyGraphRefresh();

    // Create links to connected files
    for (const linkedFile of linkedFiles) {
      // Find target node
      let targetNode = graphData.nodes.find(node => node.name === linkedFile);

      if (!targetNode) {
        continue;
      }
      // Create link
      const newLink = {
        source: newId,
        target: targetNode.id,
        type: type
      };

      // Check if link already exists
      const existingLink = graphData.links.find(
        link => link.source === newId && link.target === targetNode.id
      );

      if (!existingLink) {
        graphData.links.push(newLink);
      }
    }

    // Write the updated graph data
    fs.writeFileSync(agiGraphPath, JSON.stringify(graphData, null, 2));

    return true;
  } catch (error) {
    console.error('Error creating node in AGI graph:', error);
    return false;
  }
};

/**
 * Update links in the AGI graph
 */
export const updateLinksInAgiGraph = (nodeId: number, linkedFiles: string[], type: string): boolean => {
  try {
    // Get path to the AGI graph.json
    const agiGraphPath = fileService.getGeneratedGraphJsonPath();
    if (!agiGraphPath) {
      console.error('AGI graph path not set');
      return false;
    }

    // Read the AGI graph.json
    let graphData: { nodes: any[], links: any[] };
    try {
      const data = fs.readFileSync(agiGraphPath, 'utf8');
      graphData = JSON.parse(data);
    } catch (error) {
      console.error('Error reading AGI graph.json:', error);
      return false;
    }

    // Get all current links where this node is the source
    const currentLinks = graphData.links.filter(link => link.source === nodeId);
    const currentTargets = currentLinks.map(link => {
      const targetNode = graphData.nodes.find(n => n.id === link.target);
      return targetNode ? targetNode.name : null;
    }).filter(name => name !== null) as string[];

    // Add new links
    for (const linkedFile of linkedFiles) {
      if (!currentTargets.includes(linkedFile)) {
        // Find target node
        let targetNode = graphData.nodes.find(node => node.name === linkedFile);

        if (!targetNode) {
          continue;
        }

        // Create link
        const newLink = {
          source: nodeId,
          target: targetNode.id,
          type: type
        };

        graphData.links.push(newLink);
        notifyGraphRefresh();
      }
    }

    // Remove deleted links
    for (const currentTarget of currentTargets) {
      if (!linkedFiles.includes(currentTarget)) {
        const targetNode = graphData.nodes.find(node => node.name === currentTarget);
        if (targetNode) {
          const linkIndex = graphData.links.findIndex(
            link => link.source === nodeId && link.target === targetNode.id
          );

          // TODO: investigate why this is not working
          if (linkIndex !== -1) {
            //graphData.links.splice(linkIndex, 1);
          }
        }
      }
    }

    // Write the updated graph data
    fs.writeFileSync(agiGraphPath, JSON.stringify(graphData, null, 2));

    return true;
  } catch (error) {
    console.error('Error updating links in AGI graph:', error);
    return false;
  }
};

/**
 * Delete a node from the AGI graph
 */
const deleteNodeFromAgiGraph = (filename: string): boolean => {
  try {
    // Get path to the AGI graph.json
    const agiGraphPath = fileService.getGeneratedGraphJsonPath();
    if (!agiGraphPath) {
      console.error('AGI graph path not set');
      return false;
    }

    // Read the AGI graph.json
    let graphData: { nodes: any[], links: any[] };
    try {
      const data = fs.readFileSync(agiGraphPath, 'utf8');
      graphData = JSON.parse(data);
    } catch (error) {
      console.error('Error reading AGI graph.json:', error);
      return false;
    }

    // Find the node
    const node = graphData.nodes.find(node => node.name === filename);
    if (!node) {
      return true; // Node doesn't exist, nothing to delete
    }

    // Delete node
    const nodeIndex = graphData.nodes.findIndex(n => n.id === node.id);
    if (nodeIndex !== -1) {
      graphData.nodes.splice(nodeIndex, 1);
    }

    // Delete all links where this node is source OR target
    graphData.links = graphData.links.filter(
      link => link.source !== node.id && link.target !== node.id
    );
    notifyGraphRefresh();

    // Write the updated graph data
    fs.writeFileSync(agiGraphPath, JSON.stringify(graphData, null, 2));

    return true;
  } catch (error) {
    console.error('Error deleting node from AGI graph:', error);
    return false;
  }
};

/**
 * Sync user notes with AGI notes
 */
export const syncAgi = async (): Promise<boolean> => {
  try {
    // Get notes directory
    const notesDir = config.getMainNotesDirectory();
    if (!notesDir) {
      console.error('Notes directory not set');
      return false;
    }

    // Get generated directory
    const generatedDir = fileService.getGeneratedFolderPath();
    if (!generatedDir) {
      console.error('Generated directory not set');
      return false;
    }

    // Step 1: Get all user filenames
    const viewMode = 'main ' as viewMode;
    const userFiles = await fileService.getFilesFromDirectory(viewMode);
    const userFilenames = userFiles.map(file => file.name);

    // Step 2: Get all AGI filenames (without "generated_" prefix)
    const agiFilenames: string[] = [];
    try {
      const agiFiles = fs.readdirSync(generatedDir);
      agiFiles.forEach(file => {
        if (file.toLowerCase().endsWith('.md') && !file.startsWith('generated_') && !file.startsWith('fully_generated_')) {
          agiFilenames.push(file);
        }
      });
    } catch (error) {
      console.error('Error reading AGI directory:', error);
      return false;
    }

    // Step 3: For each AGI filename not in user directory, delete AGI files and remove from sync state
    for (const filename of agiFilenames) {
      if (!userFilenames.includes(filename)) {
        console.log(`Removing AGI file not in user directory: ${filename}`);

        // Delete file from AGI directory
        const filePath = path.join(generatedDir, filename);
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          console.error(`Error deleting file ${filename} from AGI directory: `, error);
        }

        // Delete the node from AGI graph
        deleteNodeFromAgiGraph(filename);

        // Remove from sync state tracking
        config.removeFileSyncState(filename);

        // Also delete any generated files related to this filename
        try {
          const generatedFiles = fs.readdirSync(generatedDir);
          for (const file of generatedFiles) {
            if (file.startsWith(`generated_${filename.split('.')[0]}_`) && file.endsWith('.md')) {
              const generatedFilePath = path.join(generatedDir, file);
              fs.unlinkSync(generatedFilePath);
              console.log(`Deleted related generated file: ${file}`);

              await agiDatabase.deleteNotes(generatedDir, generatedFilePath);
            }
          }
        } catch (error) {
          console.error(`Error deleting related generated files for ${filename}: `, error);
        }
      }
    }

    // Step 4: Identify files that need to be synced
    const filesToSync: string[] = [];
    
    // Add new files (not in AGI directory)
    for (const filename of userFilenames) {
      if (!agiFilenames.includes(filename)) {
        filesToSync.push(filename);
        // Mark as unsynced initially
        config.setFileSyncState(filename, false);
      }
    }

    // Add files that were previously unsynced (interrupted sync)
    const unsyncedFiles = config.getUnsyncedFiles();
    for (const filename of unsyncedFiles) {
      if (userFilenames.includes(filename) && !filesToSync.includes(filename)) {
        filesToSync.push(filename);
        console.log(`Resuming sync for previously unsynced file: ${filename}`);
      }
    }

    // Step 5: Process each file that needs to be synced
    for (const filename of filesToSync) {
      try {
        console.log(`Syncing user file to AGI: ${filename}`);

        // Copy file to AGI directory
        await copyFileToAgi(filename);

        // Read file content
        const filePath = path.join(notesDir, filename);
        const content = fileService.readFile(filePath);

        // Parse file links
        const linkedFiles = parseFileLinks(content, userFilenames);

        // Create node in AGI graph
        createNodeInAgiGraph(filename, linkedFiles, 'user');

        // Chunk the file (this will set the sync state to true if successful)
        const result = await chunk(filename, content, 'assisted');

        if (!result) {
          console.error(`Error chunking file: ${filename}`);
          // File remains marked as unsynced for retry next time
        }
      } catch (error) {
        console.error(`Error processing file ${filename}:`, error);
        // Mark as unsynced for retry
        config.setFileSyncState(filename, false);
      }
    }

    notifyGraphRefresh();

    return true;
  } catch (error) {
    console.error('Error syncing user with AGI:', error);
    return false;
  }
};

/**
 * Update AGI when a specific user file is added or modified
 */
export const updateFileInAgi = async (filename: string): Promise<boolean> => {
  try {
    // Mark file as being processed
    config.setFileSyncState(filename, false);

    // Get notes directory
    const notesDir = config.getMainNotesDirectory();
    if (!notesDir) {
      console.error('Notes directory not set');
      return false;
    }

    // Get generated directory
    const generatedDir = fileService.getGeneratedFolderPath();
    if (!generatedDir) {
      console.error('Generated directory not set');
      return false;
    }

    // Check if the file exists in the user directory
    const userFilePath = path.join(notesDir, filename);
    if (!fs.existsSync(userFilePath)) {
      // If the file doesn't exist in user directory, delete it from AGI directory
      return await removeFileFromAgi(filename);
    }

    // First, clean up any existing chunk files for this note
    await cleanupChunkFiles(filename);

    // Copy the file to AGI directory
    const copied = await copyFileToAgi(filename);
    if (!copied) return false;

    // Read the file content
    const content = fileService.readFile(userFilePath);

    // Get all user filenames to validate links
    const viewMode = 'main ' as viewMode;
    const userFiles = await fileService.getFilesFromDirectory(viewMode);
    const userFilenames = userFiles.map(file => file.name);

    // Parse file links
    const linkedFiles = parseFileLinks(content, userFilenames);

    // Update the node in AGI graph
    createNodeInAgiGraph(filename, linkedFiles, 'user');

    // Chunk the file (this will set sync state appropriately)
    const result = await chunk(filename, content, 'assisted');

    if (!result) {
      console.error(`Error chunking file: ${filename}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating file in AGI:', error);
    // Mark as unsynced for retry
    config.setFileSyncState(filename, false);
    return false;
  }
};

/**
 * Remove a user file from AGI
 */
export const removeFileFromAgi = async (filename: string): Promise<boolean> => {
  try {
    // Get generated directory
    const generatedDir = fileService.getGeneratedFolderPath();
    if (!generatedDir) {
      console.error('Generated directory not set');
      return false;
    }

    // Delete the file from AGI directory
    const agiFilePath = path.join(generatedDir, filename);
    if (fs.existsSync(agiFilePath)) {
      fs.unlinkSync(agiFilePath);
      console.log(`Deleted file from AGI directory: ${filename}`);
    }

    // Delete the node from AGI graph
    deleteNodeFromAgiGraph(filename);

    // Clean up any chunk files
    await cleanupChunkFiles(filename);

    // Remove from sync state tracking
    config.removeFileSyncState(filename);

    return true;
  } catch (error) {
    console.error('Error removing file from AGI:', error);
    return false;
  }
};