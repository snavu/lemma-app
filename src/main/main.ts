import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { ChildProcess, spawn, spawnSync } from 'child_process';
import { DbClient } from './database';

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let notesDirectory: string | null = null;
let chromaProcess: null | ChildProcess;
let database: DbClient;

// Starts up the ChromaDB by executing `chroma run --path lemma-db`
const startChromaDb = (): void => {
  const venvPath = path.join(process.cwd(), 'venv');
  const chromaRunCommand = process.platform === 'win32'
    ? path.join(venvPath, 'Scripts', 'chroma.exe')
    : path.join(venvPath, 'bin', 'chroma');

  const dbPath = path.join(process.cwd(), 'lemma-db');

  console.log('Starting ChromaDB server...');
  // Run `chroma run --path lemma-db`
  chromaProcess = spawn(chromaRunCommand, ['run', '--path', dbPath], {
    cwd: process.cwd(),
    stdio: 'inherit',
    detached: true,
    windowsHide: true
  });

  chromaProcess.on('error', (err) => {
    console.error('Failed to start Chroma:', err.message);
  });

  console.log("Started ChromaDB server with PID:", chromaProcess.pid);
};

const endChromaDb = (): void => {
  if (chromaProcess && !isNaN(chromaProcess.pid) && !chromaProcess.killed) {
    if (process.platform === 'win32') {
      chromaProcess.kill('SIGTERM'); // Kill only the main process
    }
    else {
      process.kill(-chromaProcess.pid); // Kill the whole process group
    }
    console.log('Closed ChromaDB server with PID:', chromaProcess.pid);
    chromaProcess = undefined;
  }
};

const createWindow = (): void => {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the index.html file
  // In development mode, we'll load from localhost
  // In production mode, we'll load from the dist folder
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools(); // Open DevTools in development
  } else {
    // When running in production, load from the dist folder
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Set up default notes directory and load settings
  setupDefaultNotesDirectory();
  loadConfigSettings();
};

// Create a default notes directory if none exists
const setupDefaultNotesDirectory = (): void => {
  if (notesDirectory === null) {
    // Create a 'Notes' folder in the user's documents directory
    const documentsPath = app.getPath('documents');
    const defaultNotesPath = path.join(documentsPath, 'My Notes');

    // Create the directory if it doesn't exist
    if (!fs.existsSync(defaultNotesPath)) {
      try {
        fs.mkdirSync(defaultNotesPath, { recursive: true });
        console.log(`Created default notes directory: ${defaultNotesPath}`);
      } catch (error) {
        console.error('Error creating default notes directory:', error);
        return;
      }
    }

    // Set the notes directory
    notesDirectory = defaultNotesPath;
    saveConfigSettings();

    // Notify renderer about the default directory if window is ready
    if (mainWindow) {
      mainWindow.webContents.send('notes-directory-selected', notesDirectory);
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

// Configuration functions
const configFilePath = (): string => {
  return path.join(app.getPath('userData'), 'config.json');
};

const loadConfigSettings = (): void => {
  try {
    if (fs.existsSync(configFilePath())) {
      const config = JSON.parse(fs.readFileSync(configFilePath(), 'utf8'));
      notesDirectory = config.notesDirectory || null;

      if (notesDirectory && mainWindow) {
        mainWindow.webContents.send('notes-directory-selected', notesDirectory);
      }
    }

    // If no directory is set after loading config, set up the default one
    if (notesDirectory === null) {
      setupDefaultNotesDirectory();
    }
  } catch (error) {
    console.error('Error loading config:', error);
    // Set up default directory if there was an error loading config
    setupDefaultNotesDirectory();
  }
};

const saveConfigSettings = (): void => {
  try {
    const config = { notesDirectory };
    fs.writeFileSync(configFilePath(), JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error saving config:', error);
  }
};

// Set up IPC handlers
const setupIpcHandlers = (): void => {

  ipcMain.handle('tag-search-query', async (_, searchQuery, notesDirectory) => {
    return database.queryNotesByTag(searchQuery, notesDirectory);
  });

  ipcMain.handle('keyword-search-query', async (_, searchQuery, notesDirectory) => {
    return database.queryNotes(searchQuery, notesDirectory);
  });

  ipcMain.handle('open-external', async (_, url) => {
    return await shell.openExternal(url);
  });
  // Select notes directory
  ipcMain.handle('select-notes-directory', async () => {
    return selectNotesDirectory();
  });

  // Get files from notes directory
  ipcMain.handle('get-files', async () => {
    return getFilesFromDirectory();
  });

  // Read file content
  ipcMain.handle('read-file', async (_, filePath) => {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  });

  // Save file content
  ipcMain.handle('save-file', async (_, { filePath, content, updateHashtags }) => {
    try {
      fs.writeFileSync(filePath, content);
      // Update vector database on new file content
      await database.upsertNotes(notesDirectory, filePath, content);
      return { success: true };
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  });

  // Create new file
  ipcMain.handle('create-file', async (_, fileName) => {
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
      // Create empty file
      fs.writeFileSync(filePath, '# ' + path.basename(fileName, '.md'));
      return { success: true, filePath };
    } catch (error) {
      console.error('Error creating file:', error);
      throw error;
    }
  });

  // Delete a file
  ipcMain.handle('delete-file', async (_, filePath) => {
    try {
      // Confirm the file exists
      if (!fs.existsSync(filePath)) {
        throw new Error('File does not exist');
      }

      // Make sure the file is within the notes directory (security check)
      if (!filePath.startsWith(notesDirectory!)) {
        throw new Error('Cannot delete files outside of the notes directory');
      }

      // Delete the file
      fs.unlinkSync(filePath);
      return { success: true };
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  });

  // Get current notes directory
  ipcMain.handle('get-notes-directory', () => {
    return notesDirectory;
  });

  // Handle window control messages
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

// Select notes directory
const selectNotesDirectory = async (): Promise<string | null> => {
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Notes Directory'
  });

  if (!result.canceled && result.filePaths.length > 0) {
    notesDirectory = result.filePaths[0];
    saveConfigSettings();

    // Notify renderer about the selected directory
    mainWindow.webContents.send('notes-directory-selected', notesDirectory);

    return notesDirectory;
  }

  return null;
};

// Get markdown files from directory
const getFilesFromDirectory = async (): Promise<{ name: string; path: string; stats: any }[]> => {
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

// Initialize app
app.on('ready', () => {
  startChromaDb();
  createWindow();
  createAppMenu();
  setupIpcHandlers();
  database = new DbClient();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
  else {
    endChromaDb();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    if (!chromaProcess) {
      startChromaDb();
    }
    createWindow();
  }
});

app.on('before-quit', () => {
  endChromaDb();
});
