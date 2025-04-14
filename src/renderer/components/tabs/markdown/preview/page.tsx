import React, { useEffect } from "react";
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
  /*useEffect(() => {
    console.log('Preview component mounted with doc:', doc);
  }, [doc]);*/

  try {
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

    return (
      <div className="preview markdown-body">
        {md}
      </div>
    );
  } catch (error) {
    console.error('Error processing markdown:', error);
    return (
      <div className="preview markdown-body">
        <div style={{ color: 'red', padding: '1rem' }}>
          Error rendering preview: {error instanceof Error ? error.message : String(error)}
        </div>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {doc}
        </pre>
      </div>
    );
  }
};

export default Preview;

