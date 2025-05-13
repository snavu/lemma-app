import * as fs from 'fs';
import * as path from 'path';
import * as fileService from './file-service';
import * as graphService from './graph-service';

/**
 * Process the content of a file to extract linked files
 */
const parseFileLinks = (content: string, availableFiles: string[]): string[] => {
  return graphService.parse_file_links(content, availableFiles);
};

/**
 * Chunk a file for AI processing
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
    
    // Process the content into chunks for AI processing
    // Simple chunking by splitting on paragraphs (double newlines)
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
    
    // For each significant paragraph, create a chunk file
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      if (paragraph.length < 10) continue; // Skip very short paragraphs
      
      // Create a chunk file name
      const chunkFilename = `generated_${filename.split('.')[0]}_chunk${i+1}.md`;
      const chunkPath = path.join(generatedDir, chunkFilename);
      
      // Create chunk content with metadata
      const chunkContent = `---
source: ${filename}
chunk_index: ${i+1}
total_chunks: ${paragraphs.length}
type: ${type}
---

${paragraph}`;
      
      // Write the chunk file
      fs.writeFileSync(chunkPath, chunkContent);
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
      const agiFilePath = path.join(generatedDir, filename);
      if (fs.existsSync(agiFilePath)) {
        fs.unlinkSync(agiFilePath);
        console.log(`Deleted file from AGI directory: ${filename}`);
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
      
      return true;
    }
    
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
    
    return true;
  } catch (error) {
    console.error('Error removing file from AGI:', error);
    return false;
  }
};