import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { ChildProcess, spawn, spawnSync } from 'child_process';
import { DbClient } from './database';
import * as fileService from './file-service';
import * as chromaService from './chroma-service';
import * as graphLoader from './graph-loader';
import * as userAgiSync from './agi-sync';
import { Config } from './config-service';
import { InferenceService } from './inference';

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let database: DbClient;
export let config: Config;
export let inferenceService: InferenceService;

const createWindow = (): void => {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true
    },
  });

  // Load the index.html file
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools(); // Open DevTools in development
  } else {
    // When running in production, load from the dist folder
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

// Initialize the file system configuration
const initializeFileSystem = (): void => {
  // First try to load existing settings
  const notesDir = config.getNotesDirectory();

  // If no directory is set after loading config, set up the default one
  if (!notesDir) {
    const newDir = fileService.setupDefaultNotesDirectory();

    // Notify renderer about the default directory if window is ready
    if (mainWindow && newDir) {
      mainWindow.webContents.send('notes-directory-selected', newDir);

      // Sync graph with files in the directory
      graphLoader.syncGraphWithFiles().then(success => {
        if (success) {
          console.log('Graph successfully synced with files');
        } else {
          console.error('Failed to sync graph with files');
        }
      });
    }
  } else {
    // If directory exists from config, ensure it has the proper structure
    fileService.ensureNotesDirectoryStructure(notesDir);
    fileService.setNotesDirectory(notesDir); // Set the notes directory in fileService

    // Notify renderer about the directory
    if (mainWindow) {
      mainWindow.webContents.send('notes-directory-selected', notesDir);

      // Sync graph with files in the directory
      graphLoader.syncGraphWithFiles().then(success => {
        if (success) {
          console.log('Graph successfully synced with files');

        } else {
          console.error('Failed to sync graph with files');
        }
      });
    }
  }
};

// Create app menu
const createAppMenu = () => {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Note',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('new-note');
          }
        },
        {
          label: 'Open Notes Folder',
          accelerator: 'CmdOrCtrl+O',
          click: selectNotesDirectory,
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

// Select notes directory
const selectNotesDirectory = async (): Promise<string | null> => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Notes Directory'
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const directory = result.filePaths[0];
    fileService.setNotesDirectory(directory);
    config.setNotesDirectory(directory);
    // Notify renderer about the selected directory
    mainWindow.webContents.send('notes-directory-selected', directory);

    // Sync graph with files in the new directory
    graphLoader.syncGraphWithFiles().then(success => {
      if (success) {
        console.log('Graph successfully synced with files in new directory');
      } else {
        console.error('Failed to sync graph with files in new directory');
      }
    });

    return directory;
  }

  return null;
};

// Set up IPC handlers for main process communication with renderer
const setupIpcHandlers = (): void => {

  ipcMain.handle('tag-search-query', async (_, searchQuery, notesDirectory) => {
    return database.queryNotesByTag(notesDirectory, searchQuery);
  });

  ipcMain.handle('keyword-search-query', async (_, searchQuery, notesDirectory) => {
    return database.queryNotes(notesDirectory, searchQuery);
  });

  ipcMain.handle('open-external', async (_, url) => {
    return await shell.openExternal(url);
  });

  // File system operations
  ipcMain.handle('select-notes-directory', () => selectNotesDirectory());
  ipcMain.handle('get-files', fileService.getFilesFromDirectory);
  ipcMain.handle('read-file', (_, filePath) => fileService.readFile(filePath));

  // Modified save-file handler to update the graph
  ipcMain.handle('save-file', async (_, { filePath, content, updateHashtags }) => {
    const result = await fileService.saveFile(filePath, content, updateHashtags);
    if (result.success) {
      const filename = path.basename(filePath);
      // Update the graph with the new content
      await graphLoader.updateFileInGraph(filename);
      // Update the database with the new content
      await database.upsertNotes(fileService.notesDirectory, filePath, content, 'user');

    }
    return result;
  });

  // Modified create-file handler to update the graph
  ipcMain.handle('create-file', async (_, fileName) => {
    const result = fileService.createFile(fileName);
    if (result.success) {
      // Add the new file to the graph
      await graphLoader.updateFileInGraph(fileName);

    }
    return result;
  });

  // Modified delete-file handler to update the graph
  ipcMain.handle('delete-file', (_, filePath) => {
    const result = fileService.deleteFile(filePath);
    if (result.success) {
      // Remove the file from the graph
      const filename = path.basename(filePath);
      graphLoader.removeFileFromGraph(filename);

    }
    return result;
  });


  // Graph file path operations
  ipcMain.handle('get-graph-json-path', fileService.getGraphJsonPath);
  ipcMain.handle('get-generated-graph-json-path', fileService.getGeneratedGraphJsonPath);
  ipcMain.handle('get-generated-folder-path', fileService.getGeneratedFolderPath);

  ipcMain.handle('sync-graph', async () => {
    return await graphLoader.syncGraphWithFiles();
  });

  // Config operations
  ipcMain.handle('get-notes-directory', () => {
    return config.getNotesDirectory()
  });

  ipcMain.handle('get-llm-config', () => {
    return config.getLLMConfig();
  });

  ipcMain.handle('set-llm-config', (_, llmConfig) => {
    console.log('Setting LLM config:', llmConfig);
    const result = config.setLLMConfig(llmConfig);
    // Update the inference service with new config if you have one
    inferenceService.updateConfig(llmConfig);
    return result;
  });

  ipcMain.handle('get-agi-config', () => {
    return config.getAgiConfig();
  });

  ipcMain.handle('set-agi-config', (_, enabled) => {
    const result = config.setAgiConfig(enabled);
    return result;
  });

  ipcMain.handle('sync-agi', async () => {
    // Sync user with AGI
    const success = await userAgiSync.syncAgi();
    if (success) {
      console.log('User successfully synced all files with AGI');
      return true;
    } else {
      console.error('Failed to sync user with AGI');
      return false;
    }
  });

  ipcMain.handle('update-file-in-agi', async (_, filename) => {
    const success = await userAgiSync.updateFileInAgi(filename);
    if (success) {
      console.log('User successfully synced file with AGI');
      return true;
    } else {
      console.error('Failed to sync file with AGI');
      return false;
    }
  });

  ipcMain.handle('remove-file-from-agi', async (_, filename) => {
    const success = await userAgiSync.removeFileFromAgi(filename);
    if (success) {
      console.log('User successfully removed file with AGI');
      return true;
    } else {
      console.error('Failed to remvoe file from AGI');
      return false;
    }
  });

  ipcMain.handle('get-local-inference-config', () => {
    return config.getLocalInferenceConfig();
  });
  ipcMain.handle('set-local-inference-config', (_, localInferenceConfig) => {
    const result = config.setLocalInferenceConfig(localInferenceConfig);
    return result;
  });

  // Window control messages
  ipcMain.on('window-control', (_, command) => {
    if (!mainWindow) return;

    switch (command) {
      case 'minimize':
        mainWindow.minimize();
        break;
      case 'maximize':
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize();
        } else {
          mainWindow.maximize();
        }
        break;
      case 'close':
        mainWindow.close();
        break;
    }
  });
};

// App lifecycle events
app.on('ready', () => {
  config = new Config();
  chromaService.startChromaDb();
  database = new DbClient();
  inferenceService = new InferenceService();
  createWindow();
  createAppMenu();
  setupIpcHandlers();
  initializeFileSystem();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  } else {
    chromaService.endChromaDb();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    if (!chromaService.isChromaRunning()) {
      chromaService.startChromaDb();
    }

    createWindow();
  }
});

app.on('before-quit', () => {
  chromaService.endChromaDb();
});