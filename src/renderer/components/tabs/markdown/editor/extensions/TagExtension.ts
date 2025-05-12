// TagExtension.ts
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Node as ProseMirrorNode } from 'prosemirror-model'
import './TagExtension.css'

interface TagExtensionOptions {
  updateTags?: (tags: string[]) => void
}

// Scan the document, replace every #tag with an atomic widget + wrapper
function findTagsInDocument(doc: ProseMirrorNode): { decorations: DecorationSet; tagNames: string[] } {
  const decorations: Decoration[] = []
  const tagNames: string[] = []
  const tagRegex = /#([a-zA-Z0-9_-]+)/g

  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      let match: RegExpExecArray | null
      while ((match = tagRegex.exec(node.text)) !== null) {
        const fullMatch = match[0]
        const tagName = match[1]

        const from = pos + match.index
        const to = from + fullMatch.length

        tagNames.push(tagName)

        // 1 — Invisible wrapper so the whole tag behaves atomically
        decorations.push(
          Decoration.inline(from, to, { class: 'tag-wrapper' })
        )

        // 2 — Widget that the user sees (cursor can’t enter)
        const widget = document.createElement('span')
        widget.className = 'tag-widget'
        widget.textContent = fullMatch
        widget.setAttribute('data-tag-name', tagName)
        widget.setAttribute('role', 'button')
        widget.setAttribute('tabindex', '0')
        decorations.push(
          Decoration.widget(from, widget, { side: 0, marks: [] })
        )

        // 3 — Hide the raw characters so they don’t render twice
        decorations.push(
          Decoration.inline(from, to, {
            class: 'tag-hidden-text',
            style: 'display:none;',
          })
        )
      }
    }
  })

  return { decorations: DecorationSet.create(doc, decorations), tagNames }
}

const TagExtension = Extension.create<TagExtensionOptions>({
  name: 'tag',

  addProseMirrorPlugins() {
    const key = new PluginKey('tagDecoration')
    const opts = this.options

    return [
      new Plugin({
        key,
        props: {
          decorations(state) {
            const { decorations, tagNames } = findTagsInDocument(state.doc)
            if (opts.updateTags) opts.updateTags(tagNames)
            return decorations
          },

          // Keep the caret out of the widget on click
          handleDOMEvents: {
            mousedown: (view, event) => {
              const t = event.target as HTMLElement
              if (
                t.classList.contains('tag-widget') ||
                t.classList.contains('tag-wrapper') ||
                t.closest('.tag-widget') ||
                t.closest('.tag-wrapper')
              ) {
                event.preventDefault()
                return true
              }
              return false
            },
          },

          // Arrow‑key skip + delete behaviour
          handleKeyDown(view, event) {
            const { state } = view
            const { selection } = state
            const { $from, $to } = selection

            // ← / → : hop over whole tag
            if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
              const decos = findTagsInDocument(state.doc).decorations.find()
              for (const deco of decos) {
                if (deco.spec.class !== 'tag-wrapper') continue

                // → jump to end
                if (
                  event.key === 'ArrowRight' &&
                  deco.from <= $from.pos && $from.pos < deco.to
                ) {
                  view.dispatch(
                    state.tr.setSelection(TextSelection.create(state.doc, deco.to))
                  )
                  return true
                }

                // ← jump to start
                if (
                  event.key === 'ArrowLeft' &&
                  deco.from < $to.pos && $to.pos <= deco.to
                ) {
                  view.dispatch(
                    state.tr.setSelection(TextSelection.create(state.doc, deco.from))
                  )
                  return true
                }
              }
            }

            // Backspace / Delete removes whole tag at cursor
            if (event.key === 'Backspace' || event.key === 'Delete') {
              if (!selection.empty) return false

              const pos = event.key === 'Backspace' ? $from.pos - 1 : $from.pos
              const deco = findTagsInDocument(state.doc).decorations
                .find(pos, pos + 1)
                .find(d => d.spec.class === 'tag-wrapper')

              if (deco) {
                view.dispatch(state.tr.delete(deco.from, deco.to).scrollIntoView())
                return true
              }
            }

            return false
          },
        },
      }),
    ]
  },
})

export default TagExtension
