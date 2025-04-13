// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  editorFormat: {
    onFormat: (callback: (formatType: string) => void) => {
      ipcRenderer.on('editor-format', (_event, formatType) => {
        callback(formatType);
      });
    },
    removeListeners: () => {
      ipcRenderer.removeAllListeners('editor-format');
    }
  },
  windowControls: {
    minimize: () => ipcRenderer.send('window-control', 'minimize'),
    maximize: () => ipcRenderer.send('window-control', 'maximize'),
    close: () => ipcRenderer.send('window-control', 'close')
  },
  // IPC listeners
  on: {
    notesDirectorySelected: (callback: (directory: string) => void) => {
      ipcRenderer.on('notes-directory-selected', (_, directory) => callback(directory));
      return () => {
        ipcRenderer.removeAllListeners('notes-directory-selected');
      };
    },
    newNote: (callback: () => void) => {
      ipcRenderer.on('new-note', () => callback());
      return () => {
        ipcRenderer.removeAllListeners('new-note');
      };
    }
  },
});
