import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { config } from './main';

export let notesDirectory: string | null = null;

export const setNotesDirectory = (directory: string): void => {
  notesDirectory = directory;
}

// Create a default notes directory if none exists
export const setupDefaultNotesDirectory = (): string | null => {
  if (notesDirectory === null) {
    // Create a 'Notes' folder in the user's documents directory
    const documentsPath = app.getPath('documents');
    const defaultNotesPath = path.join(documentsPath, 'LEMMA Notes');

    // Create the directory if it doesn't exist
    if (!fs.existsSync(defaultNotesPath)) {
      try {
        fs.mkdirSync(defaultNotesPath, { recursive: true });
        console.log(`Created default notes directory: ${defaultNotesPath}`);
      } catch (error) {
        console.error('Error creating default notes directory:', error);
        return null;
      }
    }

    // Set the notes directory
    notesDirectory = defaultNotesPath;
    config.setNotesDirectory(defaultNotesPath); // Save the default path to config

    // Ensure the directory has the proper structure (graph.json and generated subfolder)
    ensureNotesDirectoryStructure(defaultNotesPath);
  }

  return notesDirectory;
};

// Ensure that the notes directory has the proper structure
export const ensureNotesDirectoryStructure = (directory: string): void => {
  try {
    // Ensure graph.json exists in root directory
    const rootGraphPath = path.join(directory, 'graph.json');
    if (!fs.existsSync(rootGraphPath)) {
      const graphData: { nodes: any[], links: any[] } = { nodes: [], links: [] };
      fs.writeFileSync(rootGraphPath, JSON.stringify(graphData, null, 2));
    }

    // Ensure 'generated' subfolder exists
    const generatedPath = path.join(directory, 'generated');
    if (!fs.existsSync(generatedPath)) {
      fs.mkdirSync(generatedPath, { recursive: true });
    }

    // Ensure graph.json exists in 'generated' subfolder
    const generatedGraphPath = path.join(generatedPath, 'graph.json');
    if (!fs.existsSync(generatedGraphPath)) {
      const graphData: { nodes: any[], links: any[] } = { nodes: [], links: [] };
      fs.writeFileSync(generatedGraphPath, JSON.stringify(graphData, null, 2));
    }

  } catch (error) {
    console.error('Error ensuring notes directory structure:', error);
  }
};

// Get path to the main graph.json file
export const getGraphJsonPath = (): string | null => {
  if (!notesDirectory) {
    return null;
  }
  return path.join(notesDirectory, 'graph.json');
};

// Get path to the generated graph.json file
export const getGeneratedGraphJsonPath = (): string | null => {
  if (!notesDirectory) {
    return null;
  }
  return path.join(notesDirectory, 'generated', 'graph.json');
};

// Get path to the generated folder
export const getGeneratedFolderPath = (): string | null => {
  if (!notesDirectory) {
    return null;
  }
  return path.join(notesDirectory, 'generated');
};

// Get markdown files from directory
export const getFilesFromDirectory = async (): Promise<{ name: string; path: string; stats: any }[]> => {
  if (!notesDirectory) {
    setupDefaultNotesDirectory();
    if (!notesDirectory) {
      return [];
    }
  }

  try {
    const fileNames = fs.readdirSync(notesDirectory);

    const files = fileNames
      .filter(fileName => fileName.toLowerCase().endsWith('.md'))
      .map(fileName => {
        const filePath = path.join(notesDirectory!, fileName);
        const stats = fs.statSync(filePath);
        return {
          name: fileName,
          path: filePath,
          stats
        };
      })
      .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime()); // Sort by last modified time

    return files;
  } catch (error) {
    console.error('Error reading directory:', error);
    return [];
  }
};

// Read file content
export const readFile = (filePath: string): string => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
};

// Save file content
export const saveFile = async (filePath: string, content: string, updateHashtags: string[]): Promise<{ success: boolean }> => {
  try {
    fs.writeFileSync(filePath, content);
    return { success: true };
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
};

// Create new file
export const createFile = (fileName: string): { success: boolean; filePath: string } => {
  // Ensure we have a notes directory
  if (!notesDirectory) {
    setupDefaultNotesDirectory();

    if (!notesDirectory) {
      throw new Error('Failed to create or find a notes directory');
    }
  }

  const filePath = path.join(notesDirectory, fileName);

  // Check if file already exists
  if (fs.existsSync(filePath)) {
    throw new Error('File already exists');
  }

  try {
    // Create empty file with initial header
    fs.writeFileSync(filePath, '# ' + path.basename(fileName, '.md'));
    return { success: true, filePath };
  } catch (error) {
    console.error('Error creating file:', error);
    throw error;
  }
};

// Delete a file
export const deleteFile = (filePath: string): { success: boolean } => {
  try {
    // Confirm the file exists
    if (!fs.existsSync(filePath)) {
      throw new Error('File does not exist');
    }

    // Make sure the file is within the notes directory (security check)
    if (!notesDirectory || !filePath.startsWith(notesDirectory)) {
      throw new Error('Cannot delete files outside of the notes directory');
    }

    // Delete the file
    fs.unlinkSync(filePath);
    return { success: true };
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};