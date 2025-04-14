import React, { useState, useCallback, useEffect } from 'react';
import { Editor } from './editor/page';
import Preview from './preview/page';
import { EditorState, StateEffect } from '@codemirror/state';
import { EditorView, ViewUpdate } from '@codemirror/view';
import './live-preview.css';

interface LivePreviewProps {
  initialDoc: string;
  onChange?: (content: string) => void;
}

export const LivePreview: React.FC<LivePreviewProps> = ({ initialDoc, onChange }) => {
  const [doc, setDoc] = useState(initialDoc);
  const [currentLine, setCurrentLine] = useState<number | null>(null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);

  const handleEditorChange = useCallback((content: string) => {
    setDoc(content);
    if (onChange) {
      onChange(content);
    }
  }, [onChange]);

  const handleEditorMount = useCallback((view: EditorView) => {
    setEditorView(view);
  }, []);

  // Update cursor position
  useEffect(() => {
    if (!editorView) return;

    const updateListener = (update: ViewUpdate) => {
      if (update.selectionSet) {
        const pos = update.state.selection.main.head;
        const line = update.state.doc.lineAt(pos);
        setCurrentLine(line.number);
      }
    };

    const extension = EditorView.updateListener.of(updateListener);
    editorView.dispatch({
      effects: StateEffect.appendConfig.of([extension])
    });

    return () => {
      editorView.dispatch({
        effects: StateEffect.reconfigure.of([])
      });
    };
  }, [editorView]);

  // Get preview content excluding current line
  const getPreviewContent = () => {
    if (currentLine === null) return doc;
    
    const lines = doc.split('\n');
    return lines
      .map((line, index) => (index + 1 === currentLine ? '' : line))
      .join('\n');
  };

  return (
    <div className="live-preview-container">
      <div className="editor-section">
        <Editor 
          initialData={initialDoc} 
          onChange={handleEditorChange}
          onMount={handleEditorMount}
        />
      </div>
      <div className="preview-section">
        <Preview doc={getPreviewContent()} />
      </div>
    </div>
  );
}; 