import * as fileService from './file-service';
import * as graphService from './graph-service';
import * as fs from 'fs';
import * as path from 'path';
import { config } from './main';
import { viewMode } from 'src/shared/types';

/**
 * Synchronizes the graph.json with the actual files in the notes directory
 * - Adds nodes for new files
 * - Removes nodes for deleted files
 * - Updates links between files
 */


export const syncGraphWithFiles = async (mode: viewMode): Promise<boolean> => {
  try {
    // Get notes directory
    const notesDir = fileService.getCurrentNotesDirectory(mode);
    if (!notesDir) {
      console.error('Notes directory not set');
      return false;
    }

    // Get all markdown files in directory
    const files = await fileService.getFilesFromDirectory(mode);
    const filenames = files.map(file => file.name);

    // Get all nodes in the graph
    const nodes = graphService.get_nodes(mode) || [];
    const nodeNames = nodes.map(node => node.name);

    // Step 1: Add nodes for files that don't have corresponding nodes
    for (const filename of filenames) {
      if (!nodeNames.includes(filename)) {
        console.log(`Adding node for new file: ${filename}`);
        // Create node
        let type = 'user';
        if (filename.startsWith('generated_')) {
          type = 'assisted';
        }
        else if (filename.startsWith('fully_generated_')) {
          type = 'generated';
        }
        graphService.createNode(mode, filename, [], type);
      }
    }

    // Step 2: Remove nodes for files that no longer exist
    for (const node of nodes) {
      if (!filenames.includes(node.name)) {
        console.log(`Removing node for deleted file: ${node.name}`);
        graphService.deleteNode(mode, node.id);
      }
    }

    // Step 3: Update links for existing files
    for (const filename of filenames) {
      // Get corresponding node
      const node = graphService.getNode(mode, filename);
      if (!node) continue;

      // Read file content
      const filePath = path.join(notesDir, filename);
      const content = fileService.readFile(filePath);

      // Parse file to extract new links
      const linkedFiles = graphService.parseFileLinks(content, filenames);

      // Get all current links where this node is the source
      const links = graphService.getLinks(mode) || [];
      const currentTargets = links
        .filter(link => link.source === node.id)
        .map(link => {
          // Find target node name from id
          const targetNode = nodes.find(n => n.id === link.target);
          return targetNode ? targetNode.name : null;
        })
        .filter(name => name !== null) as string[];

      // Add new links
      for (const linkedFile of linkedFiles) {
        if (!currentTargets.includes(linkedFile)) {
          let type = 'user';
          if (linkedFile.startsWith('generated_')) {
            type = 'assisted';
          }
          else if (linkedFile.startsWith('fully_generated_')) {
            type = 'generated';
          }
          graphService.createLink(mode, node.id, linkedFile, type);
        }
      }

      // Remove deleted links
      for (const currentTarget of currentTargets) {
        if (!linkedFiles.includes(currentTarget)) {
          console.log(`Removing link from ${filename} to ${currentTarget}`);
          graphService.deleteLink(mode, node.id, currentTarget);
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error synchronizing graph with files:', error);
    return false;
  }
};

/**
 * Updates the graph when a specific file is added or modified
 */
export const updateFileInGraph = async (mode: viewMode, filename: string): Promise<boolean> => {
  try {
    // Get notes directory
    const notesDir = fileService.getCurrentNotesDirectory(mode);
    if (!notesDir) {
      console.error('Notes directory not set');
      return false;
    }

    // Get all markdown files in directory
    const files = await fileService.getFilesFromDirectory(mode);
    const filenames = files.map(file => file.name);

    // Find the file node
    let node = graphService.getNode(mode, filename);

    // Read the file content
    const filePath = path.join(notesDir, filename);
    if (!fs.existsSync(filePath)) {
      // File doesn't exist, delete node if it exists
      if (node) {
        graphService.deleteNode(mode, node.id);
      }
      return true;
    }

    const content = fileService.readFile(filePath);

    // Parse file to find linked files
    const linkedFiles = graphService.parseFileLinks(content, filenames);

  

    if (!node) {
      // Create new node if it doesn't exist
      graphService.createNode(mode, filename, linkedFiles, 'user');
      return true;
    }

    // Update links for existing node
    const links = graphService.getLinks(mode) || [];
    const currentTargets = links
      .filter(link => link.source === node.id)
      .map(link => {
        // Find target node name from id
        const nodes = graphService.get_nodes(mode) || [];
        const targetNode = nodes.find(n => n.id === link.target);
        return targetNode ? targetNode.name : null;
      })
      .filter(name => name !== null) as string[];

    // Add new links
    for (const linkedFile of linkedFiles) {
      if (!currentTargets.includes(linkedFile)) {
        graphService.createLink(mode, node.id, linkedFile, 'user');
      }
    }

    // Remove deleted links
    for (const currentTarget of currentTargets) {
      if (!linkedFiles.includes(currentTarget)) {
        graphService.deleteLink(mode, node.id, currentTarget);
      }
    }

    return true;
  } catch (error) {
    console.error('Error updating file in graph:', error);
    return false;
  }
};

/**
 * Updates the graph when a file is deleted
 */
export const removeFileFromGraph = (mode: viewMode, filename: string): boolean => {
  const node = graphService.getNode(mode, filename);
  if (node) {
    return graphService.deleteNode(mode, node.id);
  }
  return true;
};