// 1. import the types you need
import Suggestion, {
  SuggestionOptions,
  SuggestionProps,
  SuggestionKeyDownProps
} from '@tiptap/suggestion'
import { Extension, Editor } from '@tiptap/core'
import Fuse from 'fuse.js'
import tippy, { Instance as TippyInstance, Props } from 'tippy.js'

// your Note type
interface FileInfo {
  name: string;
  path: string;
  stats?: any;
}

interface CustomSuggestionProps extends SuggestionProps<FileInfo> {
  selectedIndex: number;
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
}

interface ExtendedKeyDownProps extends SuggestionKeyDownProps {
  command: (props: { editor: Editor; range: { from: number; to: number }; props: { name: string; path: string } }) => void;
  editor: Editor;
  range: { from: number; to: number };
}

// 2. Tell the Extension that its options follow SuggestionOptions<Note>
const LinkExtension = Extension.create<LinkExtensionOptions>({
  name: 'noteLink',

  addOptions() {
    return {
      files: [] as FileInfo[],
    }
  },

  addCommands() {
    return {
      setNoteLink: attributes => ({ chain }) => {
        return chain()
          .setLink({ href: attributes.path })
          .run()
      }
    }
  },

  addProseMirrorPlugins() {
    let popup: TippyInstance<Props> | undefined
    let fuse: Fuse<FileInfo> | undefined
    const files = this.options.files
    let selectedIndex = 0

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
      render: () => {
        let container: HTMLElement
        let currentItems: FileInfo[] = []
        let tippyInstance: TippyInstance<Props> | undefined
        
        const destroyPopup = () => {
          console.log("Destroying popup, current state:", tippyInstance ? "exists" : "doesn't exist")
          if (tippyInstance) {
            tippyInstance.destroy()
            tippyInstance = undefined
            popup = undefined
          }
        }
        
        const updateList = (props: SuggestionProps<FileInfo> | ExtendedKeyDownProps) => {
          const items = 'items' in props ? props.items : currentItems
          if (!items || !Array.isArray(items)) {
            return
          }
          container.innerHTML = ''
          items.forEach((note: FileInfo, idx: number) => {
            const el = document.createElement('div')
            el.className = 'suggestion-item'
            if (idx === selectedIndex) el.classList.add('is-selected')
            el.textContent = note.name
            el.addEventListener('click', () => {
              console.log("Click handler triggered")
              destroyPopup()
              suggestionConfig.command({
                editor: suggestionConfig.editor,
                range: props.range,
                props: { name: note.name, path: note.path }
              })
            })
            container.appendChild(el)
          })
        }
        
        return {
          onStart(props: SuggestionProps<FileInfo>) {
            container = document.createElement('div')
            container.className = 'suggestion-list'
            currentItems = props.items as FileInfo[]
            selectedIndex = 0
            updateList(props)
            const instances = tippy(document.body, {
              getReferenceClientRect: props.clientRect,
              appendTo: () => document.body,
              content: container,
              showOnCreate: true,
              interactive: true,
              placement: 'bottom-start',
              theme: 'light',
              maxWidth: 'none',
            }) as unknown as TippyInstance<Props>[]
            if (instances.length > 0) {
              tippyInstance = instances[0]
              popup = tippyInstance
              console.log("Created new popup instance")
            }
          },

          onUpdate(props: SuggestionProps<FileInfo>) {
            currentItems = props.items as FileInfo[]
            selectedIndex = 0  // Reset selection when items update
            updateList(props)
          },

          onKeyDown(props: ExtendedKeyDownProps) {
            const items = currentItems

            if (props.event.key === 'ArrowDown') {
              props.event.preventDefault()
              selectedIndex = (selectedIndex + 1) % items.length
              updateList(props)
              return true
            }

            if (props.event.key === 'ArrowUp') {
              props.event.preventDefault()
              selectedIndex = (selectedIndex - 1 + items.length) % items.length
              updateList(props)
              return true
            }

            if (props.event.key === 'Enter') {
              props.event.preventDefault()
              const selectedItem = items[selectedIndex]
              if (selectedItem) {
                console.log("Enter pressed, destroying popup")
                destroyPopup()
                suggestionConfig.command({
                  editor: suggestionConfig.editor,
                  range: props.range,
                  props: { name: selectedItem.name, path: selectedItem.path }
                })
              }
              return true
            }

            if (props.event.key === 'Escape') {
              props.event.preventDefault()
              destroyPopup()
              return true
            }

            return false
          },

          onExit() {
            selectedIndex = 0
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

        console.log('Creating link with:', props);

        // Always destroy popup first
        if (popup) {
          popup.destroy()
          popup = undefined
        }

        // Extract just the filename from the path
        const displayName = props.name.replace(/\.md$/, '')

        // Use the editor's native link command
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setLink({ href: props.path })
          .insertContent(displayName)
          .run()

        console.log('Link created with href:', props.path);
      },
    }

    return [
      Suggestion(suggestionConfig),
    ]
  },
})

export default LinkExtension
