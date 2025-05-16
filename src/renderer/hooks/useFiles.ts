import { useState, useEffect, useCallback } from 'react';
import { useAgi } from './useAgi';

export interface FileInfo {
  name: string;
  path: string;
  stats?: any;
}

export const useFiles = () => {
  const [notesDirectory, setNotesDirectory] = useState<string | null>(null);
  const [graphJsonPath, setGraphJsonPath] = useState<string | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const { syncAgi, updateFileInAgi } = useAgi();

  // Check for default directory on initial load
  useEffect(() => {
    const checkForDefaultDirectory = async () => {
      if (window.electron?.fs) {
        try {
          const directory = await window.electron.config.getNotesDirectory();
          if (directory) {
            setNotesDirectory(directory);
            const path = await window.electron.fs.getGraphJsonPath();
            if (path) {
              setGraphJsonPath(path);
            }
          }
        } catch (error) {
          console.error('Failed to get default notes directory:', error);
        }
      }
    };

    checkForDefaultDirectory();
  }, []);

  // Load files when directory is selected
  useEffect(() => {
    const loadFiles = async () => {
      if (notesDirectory && window.electron?.fs) {
        console.log('Loading files from directory:', notesDirectory);
        try {
          const files = await window.electron.fs.getFiles();
          setFiles(files);
          const path = await window.electron.fs.getGraphJsonPath();
          if (path) {
            setGraphJsonPath(path);
          }
          const result = await window.electron.config.getAgiConfig();
          if (result) {
            if (result.enabled) {
              syncAgi();
            }
          }
        } catch (error) {
          console.error('Failed to load files:', error);
        }
      }
    };

    if (notesDirectory) {
      console.log('Loading files from directory:', notesDirectory);
      loadFiles();
    }
  }, [notesDirectory]);

  // Set up directory selection listener
  useEffect(() => {
    if (window.electron?.on) {
      const removeListener = window.electron.on.notesDirectorySelected((directory) => {
        setNotesDirectory(directory);
      });

      return () => {
        removeListener();
      };
    }
  }, []);

  // Handle selecting notes directory
  const handleSelectDirectory = useCallback(async () => {
    if (window.electron?.fs) {
      await window.electron.fs.selectDirectory();
    }
  }, []);

  // Handle file deletion
  const handleDeleteFile = useCallback(async (filePath: string) => {
    if (!window.electron?.fs) return false;

    try {
      // Delete the file
      await window.electron.fs.deleteFile(filePath);

      // Refresh the files list
      const updatedFiles = await window.electron.fs.getFiles();
      setFiles(updatedFiles);

      // Extract just the filename from the path
      const filename = filePath.split(/[/\\]/).pop();

      const result = await window.electron.config.getAgiConfig();
      if (result) {
        if (result.enabled) {
          updateFileInAgi(filename);
        }
      }
      return true;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }, []);

  // Handle creating a new note
  const handleNewNote = useCallback(async () => {
    if (!window.electron?.fs) return;

    // The app will now use the default directory if one isn't already set
    try {
      // Create a unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `Note ${timestamp}.md`;

      await window.electron.fs.createFile(fileName);

      // Refresh files list
      const newFiles = await window.electron.fs.getFiles();
      setFiles(newFiles);

      const result = await window.electron.config.getAgiConfig();
      if (result) {
        if (result.enabled) {
          updateFileInAgi(fileName);
        }
      }

      // Get the notes directory if it's not already set
      if (!notesDirectory) {
        const directory = await window.electron.config.getNotesDirectory();
        setNotesDirectory(directory);
      }

      return result.filePath;
    } catch (error) {
      console.error('Failed to create new note:', error);
      return null;
    }
  }, [notesDirectory]);

  return {
    files,
    notesDirectory,
    graphJsonPath,
    handleSelectDirectory,
    handleDeleteFile,
    handleNewNote
  };
};