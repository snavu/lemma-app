// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer, shell } from 'electron';
import { llmConfig, agiConfig, localInferenceConfig, viewMode } from 'src/shared/types';
import { Vector2 } from 'three';

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
    getFiles: (mode: viewMode) => ipcRenderer.invoke('get-files', mode),
    readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
    saveFile: (filePath: string, content: string, updateHashtags: string[]) =>
      ipcRenderer.invoke('save-file', { filePath, content, updateHashtags }),
    createFile: (fileName: string) => ipcRenderer.invoke('create-file', fileName),
    deleteFile: (filePath: string) => ipcRenderer.invoke('delete-file', filePath),
    getGraphJsonPath: (mode: viewMode) => ipcRenderer.invoke('get-graph-json-path', mode),
    getViewMode: () => ipcRenderer.invoke('get-view-mode'),
    setViewMode: (mode: viewMode) => ipcRenderer.invoke('set-view-mode', mode),
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
    },
    graphRefresh: (callback: () => void) => {
      ipcRenderer.on('graph-refresh', () => callback());
      return () => {
        ipcRenderer.removeAllListeners('graph-refresh');
      };
    }
  },
  db: {
    queryDBTags: (searchQuery: string, notesDirectory: string) => ipcRenderer.invoke('tag-search-query', searchQuery, notesDirectory),
    queryDBKeyWords: (searchQuery: string, notesDirectory: string) => ipcRenderer.invoke('keyword-search-query', searchQuery, notesDirectory),
  },
  // Config operations
  config: {
    getCurrentNotesDirectory: (mode: viewMode) => ipcRenderer.invoke('get-current-notes-directory', mode),
    getLLMConfig: () => ipcRenderer.invoke('get-llm-config'),
    setLLMConfig: (llmConfig: llmConfig) => ipcRenderer.invoke('set-llm-config', llmConfig),
    getAgiConfig: () => ipcRenderer.invoke('get-agi-config'),
    setAgiConfig: (agiConfig: agiConfig) => ipcRenderer.invoke('set-agi-config', agiConfig),
    getLocalInferenceConfig: () => ipcRenderer.invoke('get-local-inference-config'),
    setLocalInferenceConfig: (localInferenceConfig: localInferenceConfig) => ipcRenderer.invoke('set-local-inference-config', localInferenceConfig),
  },

  // AGI operations
  agi: {
    syncAgi: () => ipcRenderer.invoke('sync-agi'),
    updateFileInAgi: (filename: string) => ipcRenderer.invoke('update-file-in-agi', filename),
    removeFileFromAgi: (filename: string) => ipcRenderer.invoke('delete-file-in-agi', filename),
    sendChatRequest: (messageArray: { role: 'user' | 'assistant'; content: string }[]) => ipcRenderer.invoke('send-chat-request', messageArray),
    onTokenReceived: (callback: (token: string) => void) => ipcRenderer.on('llm-token-received', (_event, token) => callback(token)),
    onResponseDone: (callback: () => void) => ipcRenderer.on('llm-response-done', callback),
    removeStreamListeners: () => {
      ipcRenderer.removeAllListeners('llm-token-received');
      ipcRenderer.removeAllListeners('llm-response-done');
    },

  },

});
