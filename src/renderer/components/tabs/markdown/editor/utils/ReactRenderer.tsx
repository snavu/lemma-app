import React from 'react';
import { createRoot } from 'react-dom/client';
import { Editor } from '@tiptap/core';

// This class serves as a bridge between Prosemirror and React
export default class ReactRenderer {
  private root: ReturnType<typeof createRoot> | null = null;
  private element: HTMLElement;
  private editor: Editor;
  private component: React.ComponentType<any>;
  private props: Record<string, any>;

  constructor(component: React.ComponentType<any>, props: Record<string, any>, editor: Editor) {
    this.component = component;
    this.props = props;
    this.editor = editor;
    
    // Create DOM element
    this.element = document.createElement('div');
    document.body.appendChild(this.element);
  }

  // Update the React component with new props
  update(props: Record<string, any>): void {
    this.props = {
      ...this.props,
      ...props,
    };
    
    this.render();
  }

  // Render the React component
  render(): void {
    if (!this.root) {
      this.root = createRoot(this.element);
    }
    
    const Component = this.component;
    this.root.render(
      <Component 
        {...this.props} 
        editor={this.editor}
      />
    );
  }

  // Clean up
  destroy(): void {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
    
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
} 