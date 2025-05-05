// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer, shell } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  },
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
  // File system operations
  fs: {
    selectDirectory: () => ipcRenderer.invoke('select-notes-directory'),
    getFiles: () => ipcRenderer.invoke('get-files'),
    readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
    saveFile: (filePath: string, content: string, updateHashtags: string[]) =>
      ipcRenderer.invoke('save-file', { filePath, content, updateHashtags }),
    createFile: (fileName: string) => ipcRenderer.invoke('create-file', fileName),
    deleteFile: (filePath: string) => ipcRenderer.invoke('delete-file', filePath),
    getNotesDirectory: () => ipcRenderer.invoke('get-notes-directory'),
    getGeneratedFolderPath: () => ipcRenderer.invoke('get-generated-folder-path'),
    getGraphJsonPath: () => ipcRenderer.invoke('get-graph-json-path'),
    getGeneratedGraphJsonPath: () => ipcRenderer.invoke('get-generated-graph-json-path'),
  },
  graph: {
    syncGraph: () => ipcRenderer.invoke('sync-graph'),
  },
  windowControls: {
    minimize: () => ipcRenderer.send('window-control', 'minimize'),
    maximize: () => ipcRenderer.send('window-control', 'maximize'),
    close: () => ipcRenderer.send('window-control', 'close')
  },
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
