import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import CodeBlock from '@tiptap/extension-code-block';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Markdown } from 'tiptap-markdown'
import './inline-editor.css';

interface EditorProps {
  initialData: string;
  onChange: (content: string) => void;
}

export const InlineMarkdownEditor: React.FC<EditorProps> = ({ initialData, onChange }) => {
  const [markdownContent, setMarkdownContent] = useState(initialData);
  const [isSourceMode, setIsSourceMode] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'custom-link',
        },
      }),
      CodeBlock,
      Image,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Markdown.configure({
        html: false,
        tightLists: true,
        tightListClass: 'tight',
        bulletListMarker: '-',
        linkify: true,
      }),
    ],
    content: initialData,
    onUpdate: ({ editor }) => {
      // Convert the editor content to markdown
      const markdown = editor.storage.markdown.getMarkdown();
      setMarkdownContent(markdown);
      onChange(markdown);
    },
  });

  // Update editor when initialData changes externally
  useEffect(() => {
    if (editor && initialData !== markdownContent) {
      // Use the markdown extension to set content
      editor.commands.setContent(initialData);
      setMarkdownContent(initialData);
    }
  }, [editor, initialData, markdownContent]);

  // Handle toggle between WYSIWYG and source mode
  const toggleSourceMode = () => {
    setIsSourceMode(!isSourceMode);
  };

  // Handle source mode text changes
  const handleSourceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setMarkdownContent(newContent);
    onChange(newContent);
    
    // Update editor content too (will be applied when switching back)
    if (editor) {
      editor.commands.setContent(newContent);
    }
  };

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="inline-markdown-editor">
      <div className="editor-toolbar">
        <div className="editor-tools">
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
            disabled={isSourceMode}
          >
            H1
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
            disabled={isSourceMode}
          >
            H2
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
            disabled={isSourceMode}
          >
            H3
          </button>
          <span className="divider"></span>
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'is-active' : ''}
            disabled={isSourceMode}
          >
            Bold
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'is-active' : ''}
            disabled={isSourceMode}
          >
            Italic
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={editor.isActive('strike') ? 'is-active' : ''}
            disabled={isSourceMode}
          >
            Strike
          </button>
          <span className="divider"></span>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'is-active' : ''}
            disabled={isSourceMode}
          >
            Bullet List
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'is-active' : ''}
            disabled={isSourceMode}
          >
            Ordered List
          </button>
          <button
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={editor.isActive('taskList') ? 'is-active' : ''}
            disabled={isSourceMode}
          >
            Task List
          </button>
          <span className="divider"></span>
          <button
            onClick={() => {
              const url = window.prompt('Enter URL');
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
            }}
            className={editor.isActive('link') ? 'is-active' : ''}
            disabled={isSourceMode}
          >
            Link
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={editor.isActive('codeBlock') ? 'is-active' : ''}
            disabled={isSourceMode}
          >
            Code Block
          </button>
        </div>
        <div className="editor-mode-toggle">
          <button
            onClick={toggleSourceMode}
            className={isSourceMode ? 'is-active' : ''}
          >
            {isSourceMode ? 'Visual Editor' : 'Source Code'}
          </button>
        </div>
      </div>
      
      <div className="editor-content-area">
        {isSourceMode ? (
          <textarea
            className="source-editor"
            value={markdownContent}
            onChange={handleSourceChange}
            spellCheck={false}
          />
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>
    </div>
  );
};

export default InlineMarkdownEditor;