// Add these type definitions to your global.ts or types file

interface AgiStatus {
  isRunning: boolean;
  state: string;
  perceptionMode: string;
  thoughtCount: number;
  lastGenerationTime: Date;
}

interface AgiThought {
  timestamp: Date;
  state: string;
  perceptionMode: string;
  selectedNotes: string[];
  synthesisPrompt?: string;
  generatedContent?: string;
  reasoning?: string;
}

interface Window {
  electron: {
    shell: {
      openExternal: (url: string) => Promise<void>;
    };
    editorFormat: {
      onFormat: (callback: (formatType: string) => void) => void;
      removeListeners: () => void;
    };
    windowControls: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
    };
    fs: {
      selectDirectory: () => Promise<string | null>;
      getFiles: (mode: viewMode) => Promise<Array<{ name: string; path: string; stats: any }>>;
      readFile: (filePath: string) => Promise<string>;
      saveFile: (filePath: string, content: string, updateHashtags: string[]) => Promise<{ success: boolean }>;
      createFile: (fileName: string) => Promise<{ success: boolean; filePath: string }>;
      deleteFile: (filePath: string) => Promise<{ success: boolean }>;
      getGraphJsonPath: (mode: viewMode) => Promise<string | null>;
      getViewMode: () => Promise<'main' | 'generated'>;
      setViewMode: (mode: viewMode) => Promise<void>;
    };
    graph: {
      syncGraph: () => Promise<boolean>;
    };
    on: {
      notesDirectorySelected: (callback: (directory: string) => void) => () => void;
      newNote: (callback: () => void) => () => void;
      graphRefresh: (callback: () => void) => () => void;
      generatedFilesRefresh: (callback: () => void) => () => void;
      agiStatusChanged: (callback: (status: AgiStatus) => void) => () => void; // Add this
    };
    db: {
      queryDBTags: (searchQuery: string, notesDirectory: string) => Promise<Note[]>;
      queryDBKeyWords: (searchQuery: string, notesDirectory: string) => Promise<Note[]>;
    };
    config: {
      getMainNotesDirectory: () => Promise<string | null>;
      getCurrentNotesDirectory: (mode: viewMode) => Promise<string | null>;
      getLLMConfig: () => Promise<llmConfig>;
      setLLMConfig: (llmConfig: llmConfig) => Promise<llmConfig>;
      getAgiConfig: () => Promise<agiConfig>;
      setAgiConfig: (agiConfig: agiConfig) => Promise<agiConfig>;
      getLocalInferenceConfig: () => Promise<localInferenceConfig>;
      setLocalInferenceConfig: (localInferenceConfig: localInferenceConfig) => Promise<localInferenceConfig>;
    };
    agi: {
      syncAgi: () => Promise<boolean>;
      updateFileInAgi: (filename: string) => Promise<boolean>;
      removeFileFromAgi: (filename: string) => Promise<boolean>;
      sendChatRequest: (messageArray: { role: 'user' | 'assistant'; content: string }[]) => Promise<{response: string}>;
      stopChatResponse: () => void;
      onTokenReceived: (callback: (token: string) => void) => Electron.IpcRenderer;
      onResponseDone: (callback: () => void) => Electron.IpcRenderer;
      removeStreamListeners: () => void;
      // Live AGI methods
      startLiveAgi: () => Promise<AgiStatus>;
      stopLiveAgi: () => Promise<AgiStatus>;
      getLiveAgiStatus: () => Promise<AgiStatus>;
      getAgiThoughtHistory: () => Promise<AgiThought[]>;
      updateAgiConfig: (config: Partial<agiConfig>) => Promise<AgiStatus>; 
    }
  };
  // Add electronAPI for compatibility with integrated modal
  electronAPI?: {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    on: (channel: string, callback: (...args: any[]) => void) => void;
    removeListener: (channel: string, callback: (...args: any[]) => void) => void;
  };
}