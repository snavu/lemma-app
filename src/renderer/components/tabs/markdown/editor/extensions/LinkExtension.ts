// 1. import the types you need
import Suggestion, {
  SuggestionOptions,
  SuggestionProps,
  SuggestionKeyDownProps
} from '@tiptap/suggestion'
import { Extension, Editor, Mark } from '@tiptap/core'
import Fuse from 'fuse.js'
import { Plugin, PluginKey } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Node as ProseMirrorNode } from 'prosemirror-model'
import { TextSelection } from 'prosemirror-state'
import ReactRenderer from '../utils/ReactRenderer'
import LinkSuggestionPopup from '../components/LinkSuggestionPopup'
import './LinkExtension.css'

// your Note type
interface FileInfo {
  name: string;
  path: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    noteLink: {
      setNoteLink: (attributes: { name: string; path: string }) => ReturnType;
    };
  }
}

interface LinkExtensionOptions {
  files: FileInfo[];
  // Function to handle opening a note when clicked
  openNote?: (path: string) => void;
}

interface ExtendedKeyDownProps extends SuggestionKeyDownProps {
  command: (props: { editor: Editor; range: { from: number; to: number }; props: { name: string; path: string } }) => void;
  editor: Editor;
  range: { from: number; to: number };
}

// Function to find wiki links in the document and create decorations for them
function findWikiLinks(doc: ProseMirrorNode) {
  const decorations: Decoration[] = []
  
  // Process each text node in the document
  function processTextNode(node: ProseMirrorNode, pos: number) {
    const text = node.text || '';
    
    // Look for [[any content]] pattern
    let startPos = 0;
    while (startPos < text.length) {
      // Find opening bracket sequence [[
      const openPos = text.indexOf('[[', startPos);
      if (openPos === -1) break;
      
      // Position after opening [[
      const contentStartPos = openPos + 2;
      
      // Find closing bracket sequence ]]
      const closePos = text.indexOf(']]', contentStartPos);
      if (closePos === -1) {
        startPos = contentStartPos;
        continue;
      }
      
      // Extract the title (content between brackets)
      const title = text.substring(contentStartPos, closePos);
      if (title.length === 0) {
        startPos = closePos + 2;
        continue;
      }
      
      // Create decorations THESE POSITIONS ARE ACCURATE DO NOT CHANGE THEM
      const docStartPos = pos + openPos - 1;
      const docTitleStartPos = pos + contentStartPos - 1;
      const docTitleEndPos = pos + closePos - 1;
      const docEndPos = pos + closePos + 1; // After ]]
      
      // Create a widget span for the content to make it non-editable
      const linkWidget = document.createElement('span');
      linkWidget.className = 'wiki-link-content';
      linkWidget.textContent = title;
      linkWidget.title = `Click to open note: ${title}`;
      linkWidget.setAttribute('data-link-title', title);
      linkWidget.setAttribute('role', 'button');
      linkWidget.setAttribute('aria-label', `Open note: ${title}`);
      linkWidget.setAttribute('tabindex', '0');
      
      // Add explicit click handler directly to the element for redundancy
      linkWidget.addEventListener('click', (e) => {
        console.log('Widget click handler triggered for:', title);
        // Don't add functionality here - let the main click handler work
      });
      
      // 1. Wrapper for the whole link with special attributes to make it atomic
      decorations.push(
        Decoration.inline(docStartPos, docEndPos, {
          class: 'wiki-link-wrapper'
        })
      );
      
      // 2. Hide opening brackets [[
      decorations.push(
        Decoration.inline(docStartPos, docTitleStartPos, {
          class: 'wiki-link-brackets-open',
          style: 'display: none;'
        })
      );
      
      // 3. Replace the text content with our widget to make it behave like a button
      decorations.push(
        Decoration.widget(docTitleStartPos, () => linkWidget, {side: 0})
      );
      
      // 4. Hide the actual content text
      decorations.push(
        Decoration.inline(docTitleStartPos, docTitleEndPos, {
          class: 'wiki-link-hidden-content',
          style: 'display: none;'
        })
      );
      
      // 5. Hide closing brackets ]]
      decorations.push(
        Decoration.inline(docTitleEndPos, docEndPos, {
          class: 'wiki-link-brackets-close',
          style: 'display: none;'
        })
      );
      
      // Move to the end of this link
      startPos = docEndPos;
    }
  }

  // Recursively traverse the document tree
  function traverseDoc(node: ProseMirrorNode, pos = 0) {
    if (node.isText) {
      processTextNode(node, pos);
    } else if (node.content) {
      node.forEach((child, offset) => {
        traverseDoc(child, pos + offset + 1);
      });
    }
  }

  traverseDoc(doc);
  return DecorationSet.create(doc, decorations);
}

// Create the extension
const LinkExtension = Extension.create<LinkExtensionOptions>({
  name: 'noteLink',

  addOptions() {
    return {
      files: [] as FileInfo[],
      openNote: undefined,
    }
  },

  addCommands() {
    return {
      setNoteLink: attributes => ({ chain, commands }) => {
        return chain()
          .focus()
          .insertContent(`[[${attributes.name}]]`)
          .run()
      }
    }
  },

  addProseMirrorPlugins() {
    let reactRenderer: ReactRenderer | undefined
    let fuse: Fuse<FileInfo> | undefined
    const files = this.options.files
    const editor = this.editor

    // Add click handler for note links
    const handleClick = (view: EditorView, pos: number, event: MouseEvent) => {
      // Log all clicks for debugging
      console.log('Editor click detected:', {
        target: event.target,
        pos
      });
      
      if (!(event.target instanceof HTMLElement)) return false
      
      // Check if clicked element is within our link content
      const linkContent = event.target.classList.contains('wiki-link-content') ? 
                          event.target : 
                          event.target.closest('.wiki-link-content');
                          
      if (!linkContent) {
        console.log('Click not on wiki link content');
        return false;
      }
      
      // Get the title directly from the clicked element
      const title = linkContent.textContent;
      if (!title) {
        console.log('No title found in wiki link content');
        return false;
      }
      
      // Find the file that matches this title
      const file = files.find(f => {
        const name = f.name.replace(/\.md$/, '')
        return name === title
      })
      
      // Debug info
      console.log('Wiki link clicked:', {
        title,
        matchedFile: file || 'No file match found',
        availableFiles: files.length,
        pos
      });
      
      if (file && this.options.openNote) {
        event.preventDefault()
        // Debug log for opening note
        console.log('Opening note via LinkExtension:', file.path);
        // Call the openNote function with the file path
        this.options.openNote(file.path);
        return true;
      } else {
        console.log('Cannot open note:', { 
          fileFound: !!file, 
          openNoteFunctionExists: !!this.options.openNote,
          availableFiles: files.length 
        });
      }
      
      return false
    }

    // Create the decoration plugin to style wiki links
    const decorationPlugin = new Plugin({
      key: new PluginKey('wikiLinkDecorations'),
      props: {
        decorations(state) {
          return findWikiLinks(state.doc)
        },
        handleClick,
        // Prevent cursor from entering the wiklink element
        handleDOMEvents: {
          mousedown: (view, event) => {
            if (event.target instanceof HTMLElement && 
                (event.target.classList.contains('wiki-link-content') || 
                 event.target.closest('.wiki-link-content'))) {
              // Prevent cursor from being placed inside the link
              event.preventDefault();
              
              // If it's a left click, try handling it as a link click
              if (event.button === 0) {
                console.log('Left click on wiki link, calling handleClick');
                return handleClick(view, view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos || 0, event);
              }
              
              return true;
            }
            return false;
          }
        },
        // Handle keyboard navigation to skip over wiki links
        handleKeyDown(view, event) {
          const { state } = view;
          const { selection } = state;
          const { $from, $to } = selection;
          
          // Check if we're at the edge of a wiki link when using arrow keys
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            // Find decorations at current position
            const decorations = findWikiLinks(state.doc);
            const found = decorations.find();
            
            for (let i = 0; i < found.length; i++) {
              const deco = found[i];
              
              // Handle right arrow key - skip to end of link
              if (event.key === 'ArrowRight' && 
                  deco.from <= $from.pos && $from.pos < deco.to && 
                  deco.spec.class === 'wiki-link-wrapper') {
                view.dispatch(state.tr.setSelection(
                  TextSelection.create(state.doc, deco.to)
                ));
                return true;
              }
              
              // Handle left arrow key - skip to beginning of link
              if (event.key === 'ArrowLeft' && 
                  deco.from < $to.pos && $to.pos <= deco.to && 
                  deco.spec.class === 'wiki-link-wrapper') {
                view.dispatch(state.tr.setSelection(
                  TextSelection.create(state.doc, deco.from)
                ));
                return true;
              }
            }
          }
          
          return false;
        }
      }
    })

    const suggestionConfig: SuggestionOptions<FileInfo> = {
      editor: this.editor,
      char: '[[',
      startOfLine: false,
      allowSpaces: true,
      decorationTag: 'span',
      decorationClass: 'suggestion',
      
      items: ({ query }: { query: string }) => {
        if (!fuse) {
          console.log("Initializing Fuse with files:", files);
          fuse = new Fuse<FileInfo>(files, {
            keys: ['name'],
            threshold: 0.3,
            includeScore: true,
          });
        }
        if (!query) return files.slice(0, 10);
        return fuse.search(query).map(r => r.item).slice(0, 10);
      },
      
      // Override the default suggestion behavior
      render: () => {
        let currentItems: FileInfo[] = []

        const destroyPopup = () => {
          if (!reactRenderer) {
            console.log("Popup does not exist, skipping destruction")
            return
          }
          console.log("Destroying popup")
          reactRenderer.destroy()
          reactRenderer = undefined
        }

        return {
          onStart(props: SuggestionProps<FileInfo>) {
            // Check if cursor is near an existing wiki link
            const { editor, range } = props;
            const { state } = editor.view;
            
            // We shouldn't need to check for brackets here - the suggestion plugin 
            // already detects the [[ trigger character
            // Just focus on preventing popups around existing wiki links
            
            const decorations = findWikiLinks(state.doc);
            const found = decorations.find();
            
            // Check if we're typing brackets right after a link
            const text = state.doc.textBetween(Math.max(0, range.from - 10), range.from + 2);
            // If we have ]][[, it means we're starting a new link right after an existing one
            const hasConsecutiveLinks = text.includes(']][[');
            
            // Skip showing popup if near existing wiki link
            for (let i = 0; i < found.length; i++) {
              const deco = found[i];
              if (deco.spec.class === 'wiki-link-wrapper') {
                // More focused check: only prevent popup when directly touching a wiki link
                // and not when intentionally creating a new one with [[
                if (
                    // Inside the link
                    (range.from > deco.from && range.from < deco.to) ||
                    // Right at the start of the link
                    (range.from === deco.from) ||
                    // Right after the link, but not when creating new consecutive link
                    (range.from === deco.to && !hasConsecutiveLinks)
                ) {
                  console.log('Not showing popup on existing wiki link:', {
                    cursorPos: range.from,
                    linkStart: deco.from,
                    linkEnd: deco.to,
                    hasConsecutiveLinks
                  });
                  return;
                }
              }
            }
            
            currentItems = props.items as FileInfo[]
            
            // Create React renderer with our component
            reactRenderer = new ReactRenderer(LinkSuggestionPopup, {
              items: currentItems,
              clientRect: props.clientRect,
              onItemSelect: (item: FileInfo) => {
                console.log("Item selected:", item)
                
                // Get the current editor state before executing command
                const state = editor.view.state;
                const currentSelection = state.selection;
                
                // Ensure we have a valid range
                const validRange = {
                  from: Math.min(props.range.from, state.doc.content.size),
                  to: Math.min(props.range.to, state.doc.content.size)
                };
                
                destroyPopup()
                
                // Execute command with validated range
                suggestionConfig.command({
                  editor: editor,
                  range: validRange,
                  props: { name: item.name, path: item.path }
                });
              },
              onClose: destroyPopup
            }, editor)
            
            reactRenderer.render()
          },

          onUpdate(props: SuggestionProps<FileInfo>) {
            currentItems = props.items as FileInfo[]
            
            // Update the React component
            if (reactRenderer) {
              reactRenderer.update({
                items: currentItems,
                clientRect: props.clientRect
              })
            }
          },

          onKeyDown(props: ExtendedKeyDownProps) {
            // We're now handling key events in the React component
            // This is just a fallback in case the component doesn't catch them
            if (props.event.key === 'Escape') {
              props.event.preventDefault();
              destroyPopup()
              return true
            }

            // Only handle Enter key when we know our popup is active
            if (props.event.key === 'Enter' && reactRenderer) {
              props.event.preventDefault();
              // Let the React component handle this via its own event listener
              return true;
            }

            return false
          },

          onExit() {
            destroyPopup()
          },
        }
      },

      command: ({ editor, range, props }: {
        editor: Editor,
        range: { from: number; to: number },
        props: { name: string; path: string }
      }) => {
        if (!editor) return

        console.log('Creating note link with:', props);

        // Extract just the filename from the path and include the .md extension
        const displayName = props.name.replace('.md', '')

        try {
          // Insert as text node directly to prevent escaping
          const { state, dispatch } = editor.view;
          const { tr } = state;
          const docSize = state.doc.content.size;
          
          // Validate range and adjust if needed
          const validFrom = Math.min(Math.max(0, range.from), docSize);
          const validTo = Math.min(Math.max(validFrom, range.to), docSize);
          
          // Delete the range first if valid
          if (validFrom !== validTo) {
            tr.deleteRange(validFrom, validTo);
          }
          
          // Get current position after potential deletion
          const insertPos = tr.selection.from;
          
          // Ensure insertion position is valid
          if (insertPos >= 0 && insertPos <= tr.doc.content.size) {
            // Insert the raw text with the proper wiki link format
            const text = `[[${displayName}]]`;
            tr.insertText(text, insertPos);
            
            // Apply the transaction
            dispatch(tr);
            
            // Focus back on the editor to prevent any other events from interfering
            setTimeout(() => {
              editor.view.focus();
            }, 0);
          } else {
            console.error("Invalid insertion position:", insertPos);
          }
          
          console.log('Note link created with path:', props.path);
        } catch (error) {
          console.error("Error creating link:", error);
        }
      },
    }

    return [
      Suggestion(suggestionConfig),
      decorationPlugin,
    ]
  },
})

export default LinkExtension
