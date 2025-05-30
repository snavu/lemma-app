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
  const [viewMode, setViewMode] = useState<'main' | 'generated'>('main');
  const { syncAgi, updateFileInAgi } = useAgi();
  const mode = 'main';

  // Check for default directory and view mode on initial load
  useEffect(() => {
    const initialize = async () => {
      if (window.electron?.fs) {
        try {
          // Get current view mode
          setViewMode(mode);

          // Get directories
          const directory = await window.electron.config.getCurrentNotesDirectory(mode);
          if (directory) {
            setNotesDirectory(directory);

            const path = await window.electron.fs.getGraphJsonPath(mode);
            setGraphJsonPath(path);

          }
        } catch (error) {
          console.error('Failed to initialize:', error);
        }
      }
    };

    initialize();
  }, []);

  // Load files when directory is selected
  useEffect(() => {
    const loadFiles = async () => {
      if (notesDirectory && window.electron?.fs) {
        console.log('Loading files from directory:', notesDirectory);
        try {
          const files = await window.electron.fs.getFiles(mode);
          setFiles(files);
          const path = await window.electron.fs.getGraphJsonPath(mode);
          if (path) {
            setGraphJsonPath(path);
          }
          
          const result = await window.electron.config.getAgiConfig();
          if (result) {
            if (result.enableChunking) {
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
      const updatedFiles = await window.electron.fs.getFiles(mode);
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

      const file = await window.electron.fs.createFile(fileName);

      // Refresh files list
      const newFiles = await window.electron.fs.getFiles(mode);
      setFiles(newFiles);

      const result = await window.electron.config.getAgiConfig();
      if (result) {
        if (result.enabled) {
          updateFileInAgi(fileName);
        }
      }

      return file.filePath;
    } catch (error) {
      console.error('Failed to create new note:', error);
      return null;
    }
  }, [notesDirectory]);

  const toggleViewMode = useCallback(async () => {
    const newMode = viewMode === 'main' ? 'generated' : 'main';

    // Update local state
    setViewMode(newMode);

    await window.electron.fs.setViewMode(newMode);

    // Update graph path
    const path = await window.electron.fs.getGraphJsonPath(newMode)
    setGraphJsonPath(path);

    // Reload files for the new view
    const files = await window.electron.fs.getFiles(newMode);
    setFiles(files);
  }, [viewMode]);


  return {
    files,
    setFiles,
    notesDirectory,
    graphJsonPath,
    viewMode,
    toggleViewMode,
    handleSelectDirectory,
    handleDeleteFile,
    handleNewNote
  };
};