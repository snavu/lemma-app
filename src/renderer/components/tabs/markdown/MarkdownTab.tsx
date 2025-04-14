import { LivePreview } from './LivePreview';
import './markdown-tab.css';

interface MarkdownTabProps {
  initialDoc: string;
  viewMode?: 'split' | 'editor' | 'preview';
  onChange?: (content: string) => void;
}

export const MarkdownTab = ({ initialDoc, viewMode = 'split', onChange }: MarkdownTabProps) => {
  return (
    <div className="markdown-tab">
      <LivePreview initialDoc={initialDoc} onChange={onChange} />
    </div>
  );
};
