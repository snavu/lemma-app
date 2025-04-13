
import React from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeReact from "rehype-react";
import rehypeHighlight from "rehype-highlight";
import 'highlight.js/styles/github-dark.css';
import './preview.css';
import 'github-markdown-css';

interface Props {
  doc: string;
}

const Preview: React.FC<Props> = ({ doc }) => {
  const md = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeHighlight, { detect: true })
    // @ts-expect-error rehypeReact is not typed
    .use(rehypeReact, {
      createElement: React.createElement,
      Fragment: React.Fragment,
    })
    .processSync(doc).result as React.ReactNode;

  return <div className="preview markdown-body">{md}</div>;
};

export default Preview;

