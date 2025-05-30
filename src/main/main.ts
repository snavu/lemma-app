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
import { InferenceService, startStreaming, stopStreaming } from './inference';
import { viewMode } from 'src/shared/types';
import { startExtensionService } from './extension-service';
import { useState } from 'react';

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
  config = new Config();
  // First try to load existing settings
  config.reloadConfig();
  const notesDir = config.getMainNotesDirectory();
  const viewMode = 'main' as viewMode; // Default view mode

  // If no directory is set after loading config, set up the default one
  if (!notesDir) {
    const newDir = fileService.setupDefaultNotesDirectory();

    // Notify renderer about the default directory if window is ready
    if (mainWindow && newDir) {
      mainWindow.webContents.send('notes-directory-selected', newDir);

      // Sync graph with files in the directory
      graphLoader.syncGraphWithFiles(viewMode).then(success => {
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
    fileService.MainNotesDirectory(notesDir); // Set the notes directory in fileService

    // Notify renderer about the directory
    if (mainWindow) {
      mainWindow.webContents.send('notes-directory-selected', notesDir);

      // Sync graph with files in the directory
      graphLoader.syncGraphWithFiles(viewMode).then(success => {
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
    fileService.MainNotesDirectory(directory);
    config.setMainNotesDirectory(directory);
    const viewMode = 'main' as viewMode; // Default view mode
    // Notify renderer about the selected directory
    mainWindow.webContents.send('notes-directory-selected', directory);

    // Sync graph with files in the new directory
    graphLoader.syncGraphWithFiles(viewMode).then(success => {
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
    return await database.queryNotes(notesDirectory, { searchQuery: searchQuery, searchMode: 'tag' });
  });

  ipcMain.handle('keyword-search-query', async (_, searchQuery, notesDirectory) => {
    return await database.queryNotes(notesDirectory, { searchQuery: searchQuery, searchMode: 'full-text' });
  });

  ipcMain.handle('open-external', async (_, url) => {
    return await shell.openExternal(url);
  });

  // File system operations
  ipcMain.handle('select-notes-directory', () => selectNotesDirectory());
  ipcMain.handle('get-current-notes-directory', (_, mode) => fileService.getCurrentNotesDirectory(mode));
  ipcMain.handle('get-files', (_, mode) => fileService.getFilesFromDirectory(mode));
  ipcMain.handle('read-file', (_, filePath) => fileService.readFile(filePath));

  // Modified save-file handler to update the graph
  ipcMain.handle('save-file', async (_, { filePath, content, updateHashtags }) => {
    const result = await fileService.saveFile(filePath, content, updateHashtags);
    if (result.success) {
      const filename = path.basename(filePath);
      const viewMode = 'main' as viewMode; // Default view mode
      // Update the graph with the new content
      await graphLoader.updateFileInGraph(viewMode, filename);
      // Update the database with the new content
      await database.upsertNotes(fileService.mainNotesDirectory, filePath, content, 'user');

    }
    return result;
  });

  // Modified create-file handler to update the graph
  ipcMain.handle('create-file', async (_, fileName) => {
    const result = fileService.createFile(fileName);
    const viewMode = 'main' as viewMode; // Default view mode
    if (result.success) {
      // Add the new file to the graph
      await graphLoader.updateFileInGraph(viewMode, fileName);

    }
    return result;
  });

  // Modified delete-file handler to update the graph
  ipcMain.handle('delete-file', async (_, filePath) => {
    const result = fileService.deleteFile(filePath);
    const viewMode = 'main' as viewMode; // Default view mode
    if (result.success) {
      // Remove the file from the graph
      const filename = path.basename(filePath);
      graphLoader.removeFileFromGraph(viewMode, filename);

      // Remove the file from the database
      await database.deleteNotes(fileService.mainNotesDirectory, filePath);
    }
    return result;
  });


  // Graph file path operations
  ipcMain.handle('get-graph-json-path', (_, mode) => fileService.getGraphJsonPath(mode));

  ipcMain.handle('sync-graph', async (_, mode) => {
    return await graphLoader.syncGraphWithFiles(mode);
  });

  // Config operations
  ipcMain.handle('get-main-notes-directory', () => {
    return config.getMainNotesDirectory()
  });

  ipcMain.handle('get-llm-config', () => {
    return config.getLLMConfig();
  });

  ipcMain.handle('set-llm-config', (_, llmConfig) => {
    const result = config.setLLMConfig(llmConfig);
    // Update the inference service with new config if you have one
    inferenceService.updateConfig(llmConfig);
    return result;
  });

  ipcMain.handle('get-agi-config', () => {
    return config.getAgiConfig();
  });

  ipcMain.handle('set-agi-config', (_, agiConfig) => {
    const result = config.setAgiConfig(agiConfig);
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

  ipcMain.handle('send-chat-request', async (_, messageArray) => {
    startStreaming();
    const response = await inferenceService.chatCompletion(messageArray, { stream: true }, (token) => {
      // Send each new token back to frontend
      mainWindow.webContents.send('llm-token-received', token);
    });

    stopStreaming();
    mainWindow.webContents.send('llm-response-done');
    return response;
  });

  ipcMain.handle('stop-chat-response', () => {
    // Interrupt streaming 
    stopStreaming();
    mainWindow.webContents.send('llm-response-done');
  });

  ipcMain.handle('get-local-inference-config', () => {
    return config.getLocalInferenceConfig();
  });
  ipcMain.handle('set-local-inference-config', (_, localInferenceConfig) => {
    const result = config.setLocalInferenceConfig(localInferenceConfig);
    return result;
  });

  ipcMain.handle('get-view-mode', () => {
    return config.getViewMode();
  });

  ipcMain.handle('set-view-mode', (_, mode) => {
    fileService.setViewMode(mode);
    return config.setViewMode(mode);
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

  createWindow();
  createAppMenu();
  setupIpcHandlers();
  initializeFileSystem();
  startExtensionService(3001);
  chromaService.startChromaDb();
  database = new DbClient();
  inferenceService = new InferenceService();

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
