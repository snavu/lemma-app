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
      getNotesDirectory: () => Promise<string | null>;
    };
    on: {
      notesDirectorySelected: (callback: (directory: string) => void) => () => void;
      newNote: (callback: () => void) => () => void;
    };
    db: {
      queryDatabase: (notesDirectory: string) => Promise<Array<{ id: string; filename: string; hashtags: string[] }>>;
    };
  };
}
