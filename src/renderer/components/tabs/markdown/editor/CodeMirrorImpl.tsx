import { useEffect, useState, useRef } from "react"
import { EditorState } from "@codemirror/state"
import { EditorView, keymap, highlightActiveLine, lineNumbers, highlightActiveLineGutter } from "@codemirror/view"
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { indentOnInput, bracketMatching, syntaxHighlighting, HighlightStyle } from "@codemirror/language"
import { tags } from "@lezer/highlight"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { languages } from "@codemirror/language-data"
import { oneDark } from "@codemirror/theme-one-dark"


export const transparentTheme = EditorView.theme({
  '&': {
    backgroundColor: 'transparent !important',
    height: '100%'
  },
})

const customHighlighting = HighlightStyle.define([
  {
    tag: tags.heading1,
    fontSize: '1.6em',
    fontWeight: 'bold'
  },
  {
    tag: tags.heading2,
    fontSize: '1.4em',
    fontWeight: 'bold'
  },
  {
    tag: tags.heading3,
    fontSize: '1.2em',
    fontWeight: 'bold'
  }
])

// Helper function to format text
const formatText = (view: EditorView, formatType: string) => {
  const { state } = view;
  const selection = state.selection.main;
  
  if (!selection.empty) {
    const text = state.doc.sliceString(selection.from, selection.to);
    let formattedText = '';
    
    switch (formatType) {
      case 'bold':
        formattedText = `**${text}**`;
        break;
      case 'italic': {
        const isItalic = text.startsWith('_') && text.endsWith('_');
        formattedText = isItalic ? text.slice(1, -1) : `_${text}_`;
        break;
      }
      case 'link':
        formattedText = `[${text}]()`;
        break;
      default:
        return false;
    }
    
    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: formattedText,
      },
    });
    
    return true;
  }
  
  return false;
};

const customKeymap = keymap.of([
  {
    key: "Mod-b",
    run: (view) => formatText(view, 'bold'),
  },

  {
    key: "Mod-i",
    run: (view) => formatText(view, 'italic'),
  },

  {
    key: "Mod-k",
    run: (view) => formatText(view, 'link'),
  },
]);

interface Props {
  initialDoc: string,
  onChange?: (state: EditorState) => void
}

const codeMirrorImpl = <T extends Element>(
  props: Props
): [React.MutableRefObject<T | null>, EditorView?] => {
  const refContainer = useRef<T>(null)
  const [editorView, setEditorView] = useState<EditorView>()
  const onChange = props.onChange

  useEffect(() => {
    if (!refContainer.current) return
    const startState = EditorState.create({
      doc: props.initialDoc,
      extensions: [
        keymap.of([...defaultKeymap, ...historyKeymap]),
        customKeymap,
        lineNumbers(),
        highlightActiveLineGutter(),
        history(),
        indentOnInput(),
        bracketMatching(),
        syntaxHighlighting(customHighlighting),
        highlightActiveLine(),
        markdown({
          base: markdownLanguage,
          codeLanguages: languages,
          addKeymap: true,
        }),
        oneDark,
        transparentTheme,
        EditorView.lineWrapping,
        EditorView.updateListener.of(update => {
          if (update.changes) {
            onChange && onChange(update.state)
          }
        })
      ]
    })

    const view = new EditorView({
      state: startState,
      parent: refContainer.current
    })

    setEditorView(view)
  }, [refContainer])

  // Listen for context menu formatting events from Electron
  useEffect(() => {
    if (!editorView) return;

    // Setup the event listener for context menu formatting
    const handleFormat = (formatType: string) => {
      if (editorView) {
        formatText(editorView, formatType);
      }
    };

    // Add the event listener
    if (window.electron?.editorFormat) {
      window.electron.editorFormat.onFormat(handleFormat);
    }

    // Clean up the event listener when component unmounts
    return () => {
      if (window.electron?.editorFormat) {
        window.electron.editorFormat.removeListeners();
      }
    };
  }, [editorView]);

  return [refContainer, editorView]
}

export default codeMirrorImpl
