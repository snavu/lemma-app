import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { ChildProcess, spawn, spawnSync } from 'child_process';
import { DbClient } from './database';
import * as fileService from './file-service';
import * as chromaService from './chroma-service';
import * as graphLoader from './graph-loader';

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let database: DbClient;

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

  // Initialize file system and notify renderer
  initializeFileSystem();
};

// Initialize the file system configuration
const initializeFileSystem = (): void => {
  // First try to load existing settings
  const notesDir = fileService.loadConfigSettings();
  
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
  ipcMain.handle('select-notes-directory', selectNotesDirectory);
  ipcMain.handle('get-files', fileService.getFilesFromDirectory);
  ipcMain.handle('read-file', (_, filePath) => fileService.readFile(filePath));
  
  // Modified save-file handler to update the graph
  ipcMain.handle('save-file', async (_, { filePath, content, updateHashtags }) => {
    const result = await fileService.saveFile(filePath, content, updateHashtags);
    if (result.success) {
      const filename = path.basename(filePath);
      await graphLoader.updateFileInGraph(filename);
      await database.upsertNotes(fileService.notesDirectory, filePath, content);
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
  
  ipcMain.handle('get-notes-directory', fileService.getNotesDirectory);
  
  // Graph file path operations
  ipcMain.handle('get-graph-json-path', fileService.getGraphJsonPath);
  ipcMain.handle('get-generated-graph-json-path', fileService.getGeneratedGraphJsonPath);
  ipcMain.handle('get-generated-folder-path', fileService.getGeneratedFolderPath);
  
  // New graph-related handlers
  ipcMain.handle('sync-graph', async () => {
    return await graphLoader.syncGraphWithFiles();
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
  chromaService.startChromaDb();
  createWindow();
  createAppMenu();
  setupIpcHandlers();
  database = new DbClient();
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