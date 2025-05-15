// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer, shell } from 'electron';
import { llmConfig } from 'src/main/config-service';

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
  db: {
    queryDBTags: (searchQuery: string, notesDirectory: string) => ipcRenderer.invoke('tag-search-query', searchQuery, notesDirectory),
    queryDBKeyWords: (searchQuery: string, notesDirectory: string) => ipcRenderer.invoke('keyword-search-query', searchQuery, notesDirectory),
  },
  // Config operations
  config: {
    getNotesDirectory: () => ipcRenderer.invoke('get-notes-directory'),
    getLLMConfig: () => ipcRenderer.invoke('get-llm-config'),
    setLLMConfig: (llmConfig: llmConfig) => ipcRenderer.invoke('set-llm-config', llmConfig),
    getAgiConfig: () => ipcRenderer.invoke('get-agi-config'),
    setAgiConfig: (toggle: boolean) => ipcRenderer.invoke('set-agi-config', toggle),
    getSgLangConfig: () => ipcRenderer.invoke('get-sglang-config'),
    setSgLangConfig: (sgLangConfig: { port: number; enabled: boolean }) => ipcRenderer.invoke('set-sglang-config', sgLangConfig),
  },
  sglang: {
    restartSgLang: () => ipcRenderer.invoke('restart-sglang'),
    stopSgLang: () => ipcRenderer.invoke('stop-sglang'),
  },
  // AGI operations
  agi: {
    syncAgi: () => ipcRenderer.invoke('sync-agi'),
    updateFileInAgi: (filename: string) => ipcRenderer.invoke('update-file-in-agi', filename),
    removeFileFromAgi: (filename: string) => ipcRenderer.invoke('delete-file-in-agi', filename),
  },

});
