import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
//import CodeBlock from '@tiptap/extension-code-block';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Markdown } from 'tiptap-markdown';
import './inline-editor.css';
import { ContextMenu } from '../../../context-menu/ContextMenu';
import { all, createLowlight } from 'lowlight'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { TagExtension } from './extensions/TagExtension';
import LinkExtension from './extensions/LinkExtension';

// Add type for link click event
interface LinkClickProps {
  href: string;
  event: MouseEvent;
}

interface FileInfo {
  name: string;
  path: string;
  stats?: any;
}

interface EditorProps {
  files: FileInfo[];
  initialData: string;
  onChange: (content: string) => void;
  onFileSelect?: (file: string) => void; // its the file path thats the argument
  currentFilePath?: string; // Add current file path prop
}

export const InlineMarkdownEditor: React.FC<EditorProps> = ({ initialData, onChange, files, onFileSelect, currentFilePath }) => {
  const [markdownContent, setMarkdownContent] = useState(initialData);
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  const [editLinkUrl, setEditLinkUrl] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const savedRangeRef = useRef(null);
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    isLink: boolean;
    linkUrl: string;
  }>({
    show: false,
    x: 0,
    y: 0,
    isLink: false,
    linkUrl: '',
  });

  // Create a lowlight instance for syntax highlighting
  const lowlight = createLowlight(all)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable the default code block
        codeBlock: false,
      }),
      LinkExtension.configure({
        files: files.filter(f => f.path !== currentFilePath), // Filter out current file
        openNote: onFileSelect, // Pass the onFileSelect function to open notes when wiki links are clicked
      }),
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
      Link.configure({
        openOnClick: false,  // Disable default behavior
        HTMLAttributes: {
          class: 'editor-link',
        },
        // Remove any validation to allow all link types
        validate: () => true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'code-block-wrapper',
        },
        defaultLanguage: 'typescript',
        languageClassPrefix: 'language-',
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Markdown.configure({
        html: true,
        tightLists: true,
        tightListClass: 'tight',
        bulletListMarker: '-',
        linkify: true,
      }),
      TagExtension,
    ],
    content: initialData,
    onUpdate: ({ editor }) => {
      // Convert the editor content to markdown
      const markdown = editor.storage.markdown.getMarkdown();
      console.log('[InlineMarkdownEditor] Generated Markdown:', JSON.stringify(markdown));
      setMarkdownContent(markdown);
      onChange(markdown);
    },
    editorProps: {
      handleClick: (view: any, pos: number, event: MouseEvent) => {
        const target = event.target as HTMLElement;
        const linkElement = target.closest('a');
        if (linkElement) {
          const href = linkElement.getAttribute('href');
          console.log('Link clicked:', { href, currentFilePath });
          if (href) {
            // If we have onFileselect and this is a file link (not an external URL)
            if (onFileSelect && !href.startsWith('http')) {
              // Don't allow linking to self
              if (href === currentFilePath) {
                console.log('Prevented self-linking');
                event.preventDefault();
                return true;
              }
              console.log('Calling onFileselect with:', href);
              onFileSelect(href);
              event.preventDefault();
              return true;
            }
            // For external links, open in default browser
            if (href.startsWith('http') && window.electron?.shell?.openExternal) {
              window.electron.shell.openExternal(href);
              event.preventDefault();
              return true;
            }
          }
        }
        return false;
      },
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

  // Add context menu event handler
  useEffect(() => {
    if (!editor || isSourceMode) return;

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();

      // Check if the click is on a link
      const isLink = editor.isActive('link');
      const linkUrl = isLink ? editor.getAttributes('link').href : '';

      setContextMenu({
        show: true,
        x: event.clientX,
        y: event.clientY,
        isLink,
        linkUrl,
      });
    };

    // Get the editor DOM element
    const editorElement = document.querySelector('.ProseMirror');
    if (editorElement) {
      editorElement.addEventListener('contextmenu', handleContextMenu);

      return () => {
        editorElement.removeEventListener('contextmenu', handleContextMenu);
      };
    }
  }, [editor, isSourceMode]);

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

  // Handle opening edit dialog for links
  const openEditLinkDialog = (currentUrl: React.SetStateAction<string>) => {
    if (editor) {
      // Save the current editor selection before showing dialog
      savedRangeRef.current = editor.view.state.selection;
      setEditLinkUrl(currentUrl);
      setShowEditDialog(true);
    }
  };

  // Handle confirming link edit
  const confirmEditLink = () => {
    if (editor && editLinkUrl && savedRangeRef.current) {
      // Restore the selection
      editor.view.focus();

      // First extend the selection to cover the entire link
      editor.chain().focus().extendMarkRange('link').run();
      // Then update the link attributes
      editor.chain().focus().setLink({ href: editLinkUrl }).run();

      // Reset and close dialog
      setEditLinkUrl('');
      setShowEditDialog(false);
    }
  };

  // Handle link insertion
  const handleLinkInsert = () => {
    if (!editor || !linkUrl.trim()) return;

    // Check if text is selected
    const { from, to } = editor.state.selection;
    const isTextSelected = from !== to;

    if (isTextSelected) {
      // Set link on selected text
      editor.chain().focus().setLink({ href: linkUrl }).run();
    } else {
      // Insert link with URL as text
      try {
        const linkText = new URL(linkUrl).hostname;
        editor.chain().focus().insertContent(`[${linkText}](${linkUrl})`).run();
      } catch (e) {
        // If URL parsing fails, just use the URL as text
        editor.chain().focus().insertContent(`[${linkUrl}](${linkUrl})`).run();
      }
    }

    setLinkUrl('');
    setShowLinkMenu(false);
  };

  // Helper to insert a code block with language
  const insertCodeBlock = (language = 'plaintext') => {
    if (editor) {
      editor.chain().focus().toggleCodeBlock({ language }).run();
    }
  };

  // Close context menu
  const closeContextMenu = () => {
    setContextMenu((prev) => ({ ...prev, show: false }));
  };

  // Generate context menu options based on state
  const getContextMenuOptions = () => {
    const options = [];

    if (contextMenu.isLink) {
      options.push(
        {
          label: 'Open link in default browser',
          onClick: () => {
            if (contextMenu.linkUrl && window.electron?.shell?.openExternal) {
              window.electron.shell.openExternal(contextMenu.linkUrl);
            }
          },
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          ),
        },
        {
          label: 'Add link',
          onClick: () => setShowLinkMenu(true),
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
          ),
        },
        {
          label: 'Edit link',
          onClick: () => openEditLinkDialog(contextMenu.linkUrl),
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          ),
        },
        {
          label: 'Copy URL',
          onClick: () => {
            if (contextMenu.linkUrl) {
              navigator.clipboard.writeText(contextMenu.linkUrl);
            }
          },
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          ),
        },
        {
          label: 'Remove link',
          onClick: () => {
            if (editor) {
              editor.chain().focus().unsetLink().run();
            }
          },
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
              <line x1="12" y1="2" x2="12" y2="12"></line>
            </svg>
          ),
        },
        { isSeparator: true },
      );
    } else {
      options.push({
        label: 'Add link',
        onClick: () => setShowLinkMenu(true),
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
        ),
      },
        { isSeparator: true }
      );
    }

    // Add code block option if not already in one
    if (!editor?.isActive('codeBlock')) {
      options.push({
        label: 'Insert code block',
        onClick: () => insertCodeBlock(),
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
        ),
      });
    }

    // Add generic text editing options
    options.push(
      {
        label: 'Cut',
        onClick: () => {
          if (editor) {
            document.execCommand('cut');
          }
        },
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="6" r="3"></circle>
            <circle cx="6" cy="18" r="3"></circle>
            <line x1="20" y1="4" x2="8.12" y2="15.88"></line>
            <line x1="14.47" y1="14.48" x2="20" y2="20"></line>
            <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
          </svg>
        ),
      },
      {
        label: 'Copy',
        onClick: () => {
          if (editor) {
            document.execCommand('copy');
          }
        },
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        ),
      },
      {
        label: 'Paste',
        onClick: () => {
          if (editor) {
            navigator.clipboard.readText().then(text => {
              editor.chain().focus().insertContent(text).run();
            });
          }
        },
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
          </svg>
        ),
      },
      {
        label: 'Select all',
        onClick: () => {
          if (editor) {
            editor.chain().focus().selectAll().run();
          }
        },
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="8 3 18 3 18 13"></polyline>
            <polyline points="16 8 20 12 16 16"></polyline>
            <line x1="3" y1="20" x2="20" y2="20"></line>
          </svg>
        ),
      }
    );

    return options;
  };

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="inline-markdown-editor">
      {/* Context Menu */}
      {contextMenu.show && !isSourceMode && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          options={getContextMenuOptions()}
        />
      )}

      {/* Custom Edit Link Dialog */}
      {showEditDialog && (
        <div className="dialog-overlay">
          <div className="dialog-content">
            <h3>Edit Link URL</h3>
            <input
              type="text"
              value={editLinkUrl}
              onChange={(e) => setEditLinkUrl(e.target.value)}
              placeholder="Enter new URL..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  confirmEditLink();
                } else if (e.key === 'Escape') {
                  setShowEditDialog(false);
                }
              }}
            />
            <div className="dialog-buttons">
              <button onClick={() => setShowEditDialog(false)}>Cancel</button>
              <button
                onClick={confirmEditLink}
                disabled={!editLinkUrl.trim() || !editLinkUrl.startsWith('http')}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

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
            onClick={() => setShowLinkMenu(prev => !prev)}
            className={showLinkMenu ? 'is-active' : ''}
            disabled={isSourceMode}
          >
            Insert Link
          </button>
          <button
            onClick={() => insertCodeBlock()}
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

      {showLinkMenu && !isSourceMode && (
        <div className="link-menu">
          <div className="link-input">
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="Enter URL..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleLinkInsert();
                } else if (e.key === 'Escape') {
                  setShowLinkMenu(false);
                }
              }}
              autoFocus
            />
            <button
              onClick={handleLinkInsert}
              disabled={!linkUrl.trim() || !linkUrl.startsWith('http')}
            >
              Insert
            </button>
            <button onClick={() => setShowLinkMenu(false)}>
              Cancel
            </button>
          </div>
          <div className="link-tip">
            Select text first to convert it to a link, or insert a new link at cursor position.
          </div>
        </div>
      )}

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
