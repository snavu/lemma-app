
import { Editor } from './components/editor/page';
import Preview from './components/preview/page';
import ResizableBox from 'react-resizable-box';
import './layout.css';
import { useState, useEffect, useCallback } from 'react';

export const App = () => {
  const [containerWidth, setContainerWidth] = useState(window.innerWidth);
  const [editorPercent, setEditorPercent] = useState(60); // Start at 60%
  const [doc, setDoc] = useState('## Hello World'); // Initialize doc state

  const handleDocChange = useCallback((newDoc: string) => {
    setDoc(newDoc);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setContainerWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const editorWidth = (editorPercent / 100) * containerWidth;
  const minWidth = containerWidth * 0.3;

  return (
    <div className='app'>
      <div className='header'>
        <h3>Markdown Editor</h3>
      </div>
      <div className='container'>
        <ResizableBox
          width={editorWidth}
          height={'100%'}
          minWidth={minWidth}
          maxWidth={containerWidth}
          isResizable={{ top: false, right: true, bottom: false, left: false }}
          onResizeStop={(direction, styleSize, clientSize) => {
            const newPx = clientSize.width;
            const newPercent = (newPx / containerWidth) * 100;
            setEditorPercent(Math.min(100, Math.max(30, newPercent)));
          }}
          className='resizable-box'
        >
          <div className='editor'>
            <Editor onChange={handleDocChange} initialData={doc} />
          </div>
        </ResizableBox>
        <div className='preview'>
          <Preview doc={doc} />
        </div>
      </div>
    </div>
  );
};
