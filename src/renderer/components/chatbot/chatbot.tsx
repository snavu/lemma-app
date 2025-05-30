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
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const offset = useRef({ x: 0, y: 0 });
  const chatRef = useRef<ChatMessageHandle>(null);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    offset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - offset.current.x;
      const newY = e.clientY - offset.current.y;
  
      const chatBox = document.querySelector('.chat-floating') as HTMLElement;
      const chatWidth = chatBox?.offsetWidth || 300;
      const chatHeight = chatBox?.offsetHeight || 400;
  
      const maxX = window.innerWidth - chatWidth;
      const maxY = window.innerHeight - chatHeight;
  
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    }
  }, [isDragging]);

    const onMouseUp = useCallback(() => {
      setIsDragging(false);
    }, []);

  useEffect(() => {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

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
