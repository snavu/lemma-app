import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let notesDirectory: string | null = null;

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

  // Load last used notes directory if available
  loadConfigSettings();
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
  } catch (error) {
    console.error('Error loading config:', error);
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
  ipcMain.handle('save-file', async (_, { filePath, content }) => {
    try {
      fs.writeFileSync(filePath, content);
      return { success: true };
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  });

  // Create new file
  ipcMain.handle('create-file', async (_, fileName) => {
    if (!notesDirectory) {
      throw new Error('No notes directory selected');
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
    return [];
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
  createWindow();
  createAppMenu();
  setupIpcHandlers();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
