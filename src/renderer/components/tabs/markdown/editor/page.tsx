import { useCallback, useEffect } from 'react';
import codeMirrorImpl from "./CodeMirrorImpl"
import './editor.css'

interface Props {
  initialData: string
  onChange: (data: string) => void
}

export const Editor = (props: Props) => {
  const { initialData, onChange } = props;

  const handlechange = useCallback((state: any) => {
    // Get the current document content from the editor state
    const content = state.doc.toString();
    onChange(content);
  }, [onChange]);

  const [refContainer, editorView] = codeMirrorImpl<HTMLDivElement>({
    initialDoc: initialData,
    onChange: handlechange,
  });

  useEffect(() => {
    if (editorView) {
        //Nothing to do here
    }
  }, [editorView]);

  // Update editor content when initialData changes (when a different file is opened)
  useEffect(() => {
    if (editorView) {
      const currentText = editorView.state.doc.toString();
      if (currentText !== initialData) {
        editorView.dispatch({
          changes: {
            from: 0,
            to: currentText.length,
            insert: initialData
          }
        });
      }
    }
  }, [initialData, editorView]);

  return (
    <div className='editor-wrapper' ref={refContainer}></div>
  )
}
