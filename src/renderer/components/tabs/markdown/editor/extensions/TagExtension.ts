import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core'

export interface TagOptions {
  HTMLAttributes: Record<string, any>,
}
export const TagExtension = Node.create<TagOptions>({
  name: 'tag',
  inline: true,
  group: 'inline',

  addAttributes() {
    return {
      tagName: { default: '' },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-tag]',
        getAttrs: dom => ({
          tagName: (dom as HTMLElement).getAttribute('data-tag'),
        }),
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-tag': node.attrs.tagName,
        class: 'tag-node',
      }),
      `#${node.attrs.tagName}`, // this becomes the inner text content
    ]
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /(^|\s)#([\w-]+)\s$/, // Updated regex to match only when a space follows the tag
        type: this.type,
        getAttributes: match => {
          const full = match[0]; // e.g. "#example-tag "
          const tag = match[2];  // e.g. "example-tag"
          console.log('[Tag Match]', { full, tag });
          return { tagName: tag };
        },
      }),
    ]
  }
})
