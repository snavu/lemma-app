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
    };
    db: {
      queryDBTags: (searchQuery: string, notesDirectory: string) => Promise<Note[]>;
      queryDBKeyWords: (searchQuery: string, notesDirectory: string) => Promise<Note[]>;
    };
    config: {
      getMainNotesDirectory: () => Promise<string | null>;
      getCurrentNotesDirectory: (mode: viewMode ) => Promise<string | null>;
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
    }
  };
}


