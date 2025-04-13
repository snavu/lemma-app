import { app, BrowserWindow, session, Menu, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
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

  // Set up CSP in the session
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
        ]
      }
    });
  });

  // Create a context menu
  const contextMenu = Menu.buildFromTemplate([
    { role: 'cut' },
    { role: 'copy' },
    { role: 'paste' },
    { type: 'separator' },
    { 
      label: 'Bold',
      click: () => {
        mainWindow?.webContents.send('editor-format', 'bold');
      }
    },
    { 
      label: 'Italic',
      click: () => {
        mainWindow?.webContents.send('editor-format', 'italic');
      }
    },
    { 
      label: 'Link',
      click: () => {
        mainWindow?.webContents.send('editor-format', 'link');
      }
    }
  ]);

  // Attach the context menu to the window
  mainWindow.webContents.on('context-menu', (event) => {
    event.preventDefault();
    contextMenu.popup();
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
