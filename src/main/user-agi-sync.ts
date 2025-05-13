import * as fs from 'fs';
import * as path from 'path';
import * as fileService from './file-service';
import * as graphService from './graph-service';

/**
 * Updates a parent note with links to all its chunk files
 */
const updateParentWithChunkLinks = async (parentFilename: string, chunkFilenames: string[]): Promise<boolean> => {
  try {
    // Get directories
    const notesDir = fileService.getNotesDirectory();
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
    const linkedFiles = graphService.parse_file_links(content, [...chunkFilenames, parentFilename]);
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
  return graphService.parse_file_links(content, availableFiles);
};

/**
 * Cleans up existing chunk files for a note
 */
const cleanupChunkFiles = (filename: string): void => {
  try {
    // Get generated directory
    const generatedDir = fileService.getGeneratedFolderPath();
    if (!generatedDir) {
      console.error('Generated directory not set');
      return;
    }

    const baseFilename = filename.split('.')[0];
    const chunkPrefix = `generated_${baseFilename}_chunk`;

    try {
      const generatedFiles = fs.readdirSync(generatedDir);
      // Keep track of deleted chunks to update graph
      const deletedChunks: string[] = [];

      generatedFiles.forEach(file => {
        if (file.startsWith(chunkPrefix) && file.endsWith('.md')) {
          const generatedFilePath = path.join(generatedDir, file);
          fs.unlinkSync(generatedFilePath);
          console.log(`Deleted chunk file: ${file}`);
          deletedChunks.push(file);

          // Also delete the node from AGI graph
          deleteNodeFromAgiGraph(file);
        }
      });
    } catch (error) {
      console.error(`Error cleaning up chunk files for ${filename}:`, error);
    }
  } catch (error) {
    console.error(`Error in cleanupChunkFiles: ${error}`);
  }
};

/**
 * Chunk a file for AI processing and create bi-directional links
 */
export const chunk = async (filename: string, content: string, type: string): Promise<boolean> => {
  try {
    // Get generated directory
    const generatedDir = fileService.getGeneratedFolderPath();
    if (!generatedDir) {
      console.error('Generated directory not set');
      return false;
    }

    console.log(`Chunking file: ${filename}, type: ${type}`);

    // Remove the existing chunks section if present
    const lines = content.split('\n');
    let contentLines: string[] = [];
    let inChunksSection = false;

    for (const line of lines) {
      if (line.startsWith('## Chunks')) {
        inChunksSection = true;
        continue;
      }

      if (!inChunksSection) {
        contentLines.push(line);
      }
    }

    // Define section interface for hierarchical structure
    interface Section {
      title: string;
      level: number;
      headerLine: string;
      startLine: number;
      endLine: number;
      parent: Section | null;
      children: Section[];
    }

    // Parse the document structure to identify sections
    let documentTitle = '';
    let rootSection: Section | null = null;

    // First pass: identify the document title (h1)
    for (let i = 0; i < contentLines.length; i++) {
      const line = contentLines[i];
      if (line.startsWith('# ')) {
        documentTitle = line.replace(/^# /, '');
        rootSection = {
          title: documentTitle,
          level: 1,
          headerLine: line,
          startLine: i,
          endLine: contentLines.length - 1,
          parent: null,
          children: []
        };
        break;
      }
    }

    // If no h1 found, create a default root section
    if (!rootSection) {
      rootSection = {
        title: 'Document',
        level: 0,
        headerLine: '',
        startLine: 0,
        endLine: contentLines.length - 1,
        parent: null,
        children: []
      };
    }

    // Second pass: build section hierarchy
    const sectionStack: Section[] = [rootSection];

    for (let i = 0; i < contentLines.length; i++) {
      const line = contentLines[i];

      if (line.startsWith('#')) {
        const level = line.match(/^#+/)?.[0].length || 0;
        const title = line.replace(/^#+\s+/, '');

        // Skip if this is the root h1 we already processed
        if (level === 1 && title === documentTitle) {
          continue;
        }

        // Pop sections from stack until we find a parent with lower level
        while (
          sectionStack.length > 0 &&
          sectionStack[sectionStack.length - 1].level >= level
        ) {
          const poppedSection = sectionStack.pop();
          if (poppedSection) {
            poppedSection.endLine = i - 1;
          }
        }

        // Create new section with the current top of stack as parent
        const parent = sectionStack[sectionStack.length - 1] || rootSection;
        const newSection: Section = {
          title,
          level,
          headerLine: line,
          startLine: i,
          endLine: contentLines.length - 1, // Will be updated when another section starts/ends
          parent,
          children: []
        };

        // Add as child to parent
        parent.children.push(newSection);

        // Push to stack
        sectionStack.push(newSection);
      }
    }

    // Finalize end lines for sections still in stack
    while (sectionStack.length > 0) {
      const section = sectionStack.pop();
      if (section) {
        section.endLine = contentLines.length - 1;
      }
    }

    // Create self-contained chunks based on the section hierarchy
    interface Chunk {
      title: string;
      content: string[];
    }

    const chunks: Chunk[] = [];

    // Helper function to build the context path for a section
    const buildContextPath = (section: Section): string[] => {
      const path: string[] = [];
      let current: Section | null = section;

      while (current && current.level > 0) {
        // Add to the beginning of path to maintain correct order
        path.unshift(current.headerLine);
        current = current.parent;
      }

      return path;
    };

    // Helper function to extract linked references from content
    const extractLinkedReferences = (content: string[]): string[] => {
      const linkedRefs: string[] = [];
      const regex = /\[\[(.*?)\]\]/g;

      content.forEach(line => {
        let match;
        while ((match = regex.exec(line)) !== null) {
          linkedRefs.push(match[1]);
        }
      });

      return linkedRefs;
    };

    // Process a section to create a chunk
    const processSection = (section: Section) => {
      // Skip the root section
      if (section.level <= 1) {
        // Process all children
        section.children.forEach(child => processSection(child));
        return;
      }

      // Create chunks for level 2 and 3 headers
      if (section.level <= 3) {
        // Build the context path (headers)
        const contextPath = buildContextPath(section);

        // Extract the content for this section
        const sectionContent = contentLines.slice(section.startLine, section.endLine + 1);

        // Build complete chunk content with context
        const chunkContent = [
          ...contextPath.slice(0, -1), // All parent headers except the current one
          '',  // Empty line for readability
          ...sectionContent // The section itself with its header
        ];

        chunks.push({
          title: section.title,
          content: chunkContent
        });
      }

      // Process all children regardless of whether this section created a chunk
      section.children.forEach(child => processSection(child));
    };

    // Start processing from root
    if (rootSection) {
      processSection(rootSection);
    }

    // If no chunks were created (no h2/h3 headers), create one for the whole document
    if (chunks.length === 0) {
      chunks.push({
        title: documentTitle || 'Document',
        content: contentLines
      });
    }

    // Create files for each chunk
    const chunkFilenames: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Create a safe filename
      const baseFilename = filename.split('.')[0];
      const safeTitle = chunk.title
        .replace(/[^\w\s]/g, '') // Remove special chars
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .substring(0, 30); // Limit length

      const chunkFilename = `generated_${baseFilename}_${safeTitle}_chunk${i + 1}.md`;
      const chunkPath = path.join(generatedDir, chunkFilename);

      // Extract linked references to add to graph
      const linkedRefs = extractLinkedReferences(chunk.content);
      const linkedFiles = [
        filename, // Link to parent
        ...linkedRefs.map(ref => `${ref}.md`) // Links to referenced files
      ];

      // Create chunk content with metadata
      const chunkContent = `---
source: ${filename}
chunk_index: ${i + 1}
total_chunks: ${chunks.length}
type: ${type}
chunk_title: "${chunk.title}"
---

${chunk.content.join('\n')}

---
Parent note: [[${filename.replace('.md', '')}]]`;

      // Write the chunk file
      fs.writeFileSync(chunkPath, chunkContent);

      // Add to graph
      createNodeInAgiGraph(chunkFilename, linkedFiles, 'generated');

      // Track this chunk filename
      chunkFilenames.push(chunkFilename);
    }

    // Update the parent note with links to all chunks
    if (chunkFilenames.length > 0) {
      await updateParentWithChunkLinks(filename, chunkFilenames);
    }

    return true;
  } catch (error) {
    console.error('Error chunking file:', error);
    return false;
  }
};

/**
 * Copy a file from user notes to AGI notes directory
 */
const copyFileToAgi = async (filename: string): Promise<boolean> => {
  try {
    const notesDir = fileService.getNotesDirectory();
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

    return true;
  } catch (error) {
    console.error(`Error copying file ${filename} to AGI directory:`, error);
    return false;
  }
};

/**
 * Create or update a node in the AGI graph
 */
const createNodeInAgiGraph = (filename: string, linkedFiles: string[], type: string): boolean => {
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

    // Create links to connected files
    for (const linkedFile of linkedFiles) {
      // Find target node
      let targetNode = graphData.nodes.find(node => node.name === linkedFile);

      if (!targetNode) {
        // Create target node if it doesn't exist
        const targetId = graphData.nodes.length > 0
          ? Math.max(...graphData.nodes.map(node => node.id)) + 1
          : 0;

        targetNode = {
          id: targetId,
          name: linkedFile,
          type: type
        };

        graphData.nodes.push(targetNode);
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
const updateLinksInAgiGraph = (nodeId: number, linkedFiles: string[], type: string): boolean => {
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
          // Create target node if it doesn't exist
          const targetId = graphData.nodes.length > 0
            ? Math.max(...graphData.nodes.map(node => node.id)) + 1
            : 0;

          targetNode = {
            id: targetId,
            name: linkedFile,
            type: type
          };

          graphData.nodes.push(targetNode);
        }

        // Create link
        const newLink = {
          source: nodeId,
          target: targetNode.id,
          type: type
        };

        graphData.links.push(newLink);
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

          if (linkIndex !== -1) {
            graphData.links.splice(linkIndex, 1);
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
export const syncUserWithAgi = async (): Promise<boolean> => {
  try {
    // Get notes directory
    const notesDir = fileService.getNotesDirectory();
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
    const userFiles = await fileService.getFilesFromDirectory();
    const userFilenames = userFiles.map(file => file.name);

    // Step 2: Get all AGI filenames (without "generated_" prefix)
    const agiFilenames: string[] = [];
    try {
      const agiFiles = fs.readdirSync(generatedDir);
      agiFiles.forEach(file => {
        if (file.toLowerCase().endsWith('.md') && !file.startsWith('generated_')) {
          agiFilenames.push(file);
        }
      });
    } catch (error) {
      console.error('Error reading AGI directory:', error);
      return false;
    }

    // Step 3: For each user filename not in AGI directory
    for (const filename of userFilenames) {
      if (!agiFilenames.includes(filename)) {
        console.log(`Syncing user file to AGI: ${filename}`);

        // Copy file to AGI directory
        const copied = await copyFileToAgi(filename);
        if (!copied) continue;

        // Read file content
        const filePath = path.join(notesDir, filename);
        const content = fileService.readFile(filePath);

        // Parse file links
        const linkedFiles = parseFileLinks(content, userFilenames);

        // Create node in AGI graph
        createNodeInAgiGraph(filename, linkedFiles, 'assisted');

        // Chunk the file
        await chunk(filename, content, 'assisted');
      }
    }

    // Step 4: For each AGI filename not in user directory, delete AGI files
    for (const filename of agiFilenames) {
      if (!userFilenames.includes(filename)) {
        console.log(`Removing AGI file not in user directory: ${filename}`);

        // Delete file from AGI directory
        const filePath = path.join(generatedDir, filename);
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          console.error(`Error deleting file ${filename} from AGI directory:`, error);
        }

        // Delete the node from AGI graph
        deleteNodeFromAgiGraph(filename);

        // Also delete any generated files related to this filename
        try {
          const generatedFiles = fs.readdirSync(generatedDir);
          generatedFiles.forEach(file => {
            if (file.startsWith(`generated_${filename.split('.')[0]}`) && file.endsWith('.md')) {
              const generatedFilePath = path.join(generatedDir, file);
              fs.unlinkSync(generatedFilePath);
              console.log(`Deleted related generated file: ${file}`);
            }
          });
        } catch (error) {
          console.error(`Error deleting related generated files for ${filename}:`, error);
        }
      }
    }

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
    // Get notes directory
    const notesDir = fileService.getNotesDirectory();
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
      return removeFileFromAgi(filename);
    }

    // First, clean up any existing chunk files for this note
    cleanupChunkFiles(filename);

    // Copy the file to AGI directory
    const copied = await copyFileToAgi(filename);
    if (!copied) return false;

    // Read the file content
    const content = fileService.readFile(userFilePath);

    // Get all user filenames to validate links
    const userFiles = await fileService.getFilesFromDirectory();
    const userFilenames = userFiles.map(file => file.name);

    // Parse file links
    const linkedFiles = parseFileLinks(content, userFilenames);

    // Update the node in AGI graph
    createNodeInAgiGraph(filename, linkedFiles, 'assisted');

    // Chunk the file
    await chunk(filename, content, 'assisted');

    return true;
  } catch (error) {
    console.error('Error updating file in AGI:', error);
    return false;
  }
};

/**
 * Remove a user file from AGI
 */
export const removeFileFromAgi = (filename: string): boolean => {
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
    cleanupChunkFiles(filename);

    return true;
  } catch (error) {
    console.error('Error removing file from AGI:', error);
    return false;
  }
};