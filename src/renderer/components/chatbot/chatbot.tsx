import React, { useRef, useState, useEffect, useCallback, Dispatch, SetStateAction, forwardRef, useImperativeHandle } from 'react';
import { ChatHeader } from './chatHeader';
import { ChatMessage, ChatMessageHandle } from './chatMessage';
import { ChatInput } from './chatInput';
import './chatbot.css';

interface chatUIProps {
  isChatOpen: boolean;
  setIsChatOpen: (bool: boolean) => void;
  messages: { role: 'user' | 'assistant'; content: string }[];
  setMessages: Dispatch<SetStateAction<{ role: 'user' | 'assistant'; content: string }[]>>;
}

export const ChatUI: React.FC<chatUIProps> = ({ isChatOpen, setIsChatOpen, messages, setMessages }) => {
// Tracks whether the chat box is currently being dragged
const [isDragging, setIsDragging] = useState(false);
// Tracks the current position of the chat box
const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
// Stores the offset between the mouse position and the top-left corner of the chat box
const offset = useRef({ x: 0, y: 0 });
// Reference to the chat message handler
const chatRef = useRef<ChatMessageHandle>(null);

// Called when the user starts dragging the chat box
const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
  e.preventDefault();
  setIsDragging(true);
  offset.current = {
    x: e.clientX - position.x,
    y: e.clientY - position.y,
  };
};

// Called as the user moves the mouse while dragging
const onMouseMove = useCallback((e: MouseEvent) => {
  if (isDragging) {
    const newX = e.clientX - offset.current.x;
    const newY = e.clientY - offset.current.y;

    // Get chat box dimensions for clamping
    const chatBox = document.querySelector('.chat-floating') as HTMLElement;
    const chatWidth = chatBox?.offsetWidth || 300;
    const chatHeight = chatBox?.offsetHeight || 400;

    // Clamp the position to stay within the window bounds
    const maxX = window.innerWidth - chatWidth;
    const maxY = window.innerHeight - chatHeight;

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  }
}, [isDragging]);

// Called when the user releases the mouse button
const onMouseUp = useCallback(() => {
  setIsDragging(false);
}, []);

// Attach and clean up global mousemove/mouseup listeners
useEffect(() => {
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  return () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };
}, [onMouseMove, onMouseUp]);

// Don't render the chat box if it's closed
if (!isChatOpen) return null;

  return (
    <div
      className="chat-floating"
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >
      <ChatHeader 
        setIsChatOpen={setIsChatOpen}
        onMouseDown={onMouseDown}
        setMessages={setMessages}
        ChatMessageHandle={chatRef}
      />
      <ChatMessage
        messages={messages}
        isChatOpen={isChatOpen}
        ref={chatRef}
      />
      <ChatInput ChatMessageHandle={chatRef}/>
    </div>
  );
};
