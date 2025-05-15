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
      getFiles: () => Promise<Array<{ name: string; path: string; stats: any }>>;
      readFile: (filePath: string) => Promise<string>;
      saveFile: (filePath: string, content: string, updateHashtags: string[]) => Promise<{ success: boolean }>;
      createFile: (fileName: string) => Promise<{ success: boolean; filePath: string }>;
      deleteFile: (filePath: string) => Promise<{ success: boolean }>;
      getGeneratedFolderPath: () => Promise<string | null>;
      getGraphJsonPath: () => Promise<string | null>;
      getGeneratedGraphJsonPath: () => Promise<string | null>;
    };
    graph: {
      syncGraph: () => Promise<boolean>;
    };
    on: {
      notesDirectorySelected: (callback: (directory: string) => void) => () => void;
      newNote: (callback: () => void) => () => void;
    };
    db: {
      queryDBTags: (searchQuery: string, notesDirectory: string) => Promise<Note[]>;
      queryDBKeyWords: (searchQuery: string, notesDirectory: string) => Promise<Note[]>;
    };
    config: {
      getNotesDirectory: () => Promise<string | null>;
      getLLMConfig: () => Promise<llmConfig>;
      setLLMConfig: (llmConfig: llmConfig) => Promise<llmConfig>;
      getAgiConfig: () => Promise<agiConfig>;
      setAgiConfig: (enabled: boolean) => Promise<agiConfig>;
      getLocalInferenceConfig: () => Promise<localInferenceConfig>;
      setLocalInferenceConfig: (enabled: boolean) => Promise<localInferenceConfig>;
    };
    agi: {
      syncAgi: () => Promise<boolean>;
      updateFileInAgi: (filename: string) => Promise<boolean>;
      removeFileFromAgi: (filename: string) => Promise<boolean>;
      sendChatRequest: (messageArray: { role: 'user' | 'assistant'; content: string }[]) => Promise<{response: string}>;
    }
  };
}


