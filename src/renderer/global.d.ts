interface Window {
  electron: {
    editorFormat: {
      onFormat: (callback: (formatType: string) => void) => void;
      removeListeners: () => void;
    },
    windowControls: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
    }
  }
} 