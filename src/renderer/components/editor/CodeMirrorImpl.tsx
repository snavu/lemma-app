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


const customKeymap = keymap.of([
  {
    key: "Mod-b",
    run: (view) => {
      const { state } = view;
      const selection = state.selection.main;
      if (!selection.empty) {
        const text = state.doc.sliceString(selection.from, selection.to);
        view.dispatch({
          changes: {
            from: selection.from,
            to: selection.to,
            insert: `**${text}**`,
          },
        });
      }
      return true;
    },
  },

  {
    key: "Mod-i",
    run: (view) => {
      const { state } = view;
      const selection = state.selection.main;
      if (!selection.empty) {
        const text = state.doc.sliceString(selection.from, selection.to);
        
        // Check if text is already italic
        const isItalic = text.startsWith('_') && text.endsWith('_');
        const newText = isItalic 
          ? text.slice(1, -1) // Remove _ from start and end
          : `_${text}_`;      // Add _ to start and end

        view.dispatch({
          changes: {
            from: selection.from,
            to: selection.to,
            insert: newText,
          },
        });
      }
      return true;
    },
  },

  {
    key: "Mod-k",
    run: (view) => {
      const { state } = view;
      const selection = state.selection.main;
      if (!selection.empty) {
        const text = state.doc.sliceString(selection.from, selection.to);
        
        view.dispatch({
          changes: {
            from: selection.from,
            to: selection.to,
            insert: `[${text}]()`,
          },
        });
      }
      return true;
    },
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

  return [refContainer, editorView]
}

export default codeMirrorImpl
