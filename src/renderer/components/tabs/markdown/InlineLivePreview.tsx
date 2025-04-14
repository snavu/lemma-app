// inline.tsx
import React from 'react';
import './inline-live-preview.css';
import { 
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  codeBlockPlugin,
  diffSourcePlugin,
  toolbarPlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  tablePlugin,
  frontmatterPlugin,
  directivesPlugin,
  jsxPlugin
} from '@mdxeditor/editor';

interface InlineLivePreviewProps {
  initialDoc: string;
  onChange?: (content: string) => void;
}

export const InlineLivePreview: React.FC<InlineLivePreviewProps> = ({ initialDoc, onChange }) => {
  // Fix code block syntax in the initial document
  const fixedInitialDoc = React.useMemo(() => {
    // Replace any problematic code block syntax
    return initialDoc.replace(/```(\w*)\n/g, '```$1\n').replace(/```\n/g, '```\n');
  }, [initialDoc]);

  return (
    <div className="inline-live-preview-container">
      <MDXEditor
        markdown={fixedInitialDoc}
        onChange={onChange}
        plugins={[
          // Essential plugins
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          markdownShortcutPlugin(),
          
          // Code and formatting
          codeBlockPlugin({
            defaultCodeBlockLanguage: 'javascript'
          }),
          diffSourcePlugin(),
          
          // Rich content
          linkPlugin(),
          linkDialogPlugin(),
          imagePlugin(),
          tablePlugin(),
          
          // Advanced features
          frontmatterPlugin(),
          directivesPlugin(),
          jsxPlugin({
            jsxComponentDescriptors: []
          }),
          
          // Toolbar
          toolbarPlugin({
            toolbarContents: () => (
              <div className="mdx-editor-toolbar">
                {/* Basic formatting */}
                <button className="toolbar-button" onClick={() => document.execCommand('bold', false)}>Bold</button>
                <button className="toolbar-button" onClick={() => document.execCommand('italic', false)}>Italic</button>
                <button className="toolbar-button" onClick={() => document.execCommand('underline', false)}>Underline</button>
                
                {/* Lists */}
                <button className="toolbar-button" onClick={() => document.execCommand('insertOrderedList', false)}>Ordered List</button>
                <button className="toolbar-button" onClick={() => document.execCommand('insertUnorderedList', false)}>Unordered List</button>
                
                {/* Code */}
                <button className="toolbar-button" onClick={() => {
                  const language = prompt('Enter language (e.g., javascript, python, typescript):', 'javascript');
                  if (language) {
                    // Insert a properly formatted code block
                    const codeBlock = `\`\`\`${language}\n\n\`\`\``;
                    document.execCommand('insertText', false, codeBlock);
                    
                    // Position cursor inside the code block
                    const selection = window.getSelection();
                    if (selection) {
                      const range = selection.getRangeAt(0);
                      range.setStart(range.startContainer, range.startOffset - 3);
                      range.collapse(true);
                      selection.removeAllRanges();
                      selection.addRange(range);
                    }
                  }
                }}>Code Block</button>
                
                {/* Links and Images */}
                <button className="toolbar-button" onClick={() => document.execCommand('createLink', false)}>Link</button>
                <button className="toolbar-button" onClick={() => document.execCommand('insertImage', false)}>Image</button>
                
                {/* Tables */}
                <button className="toolbar-button" onClick={() => document.execCommand('insertTable', false)}>Table</button>
                
                {/* Source toggle */}
                <button className="toolbar-button" onClick={() => document.execCommand('formatBlock', false, 'div')}>Source</button>
              </div>
            )
          })
        ]}
      />
    </div>
  );
};
