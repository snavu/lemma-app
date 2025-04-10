import React from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import remarkGfm from "remark-gfm";
import rehypeReact from "rehype-react";
import rehypeHighlight from "rehype-highlight";
import 'highlight.js/styles/github-dark.css'
import './preview.css'
import 'github-markdown-css'

interface Props {
  doc: string
}

const Preview = (props: Props) => {
  const md = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeReact as any, { createElement: React.createElement })
    .use(rehypeHighlight)
    .processSync(props.doc).result as React.ReactElement

  return <div className="preview markdown-body">{md}</div>
}

export default Preview
