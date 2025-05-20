import React, { useRef, useState, useEffect, useCallback, Dispatch, SetStateAction, forwardRef, useImperativeHandle } from 'react';
import { ChatHeader } from './chatHeader';
import { ChatMessage, ChatMessageHandle } from './chatMessage';
import './chatbot.css';

interface chatUIProps {
    isChatOpen: boolean;
    setIsChatOpen: (bool: boolean) => void;
    messages: { role: 'user' | 'assistant'; content: string }[];
    setMessages: Dispatch<SetStateAction<{ role: 'user' | 'assistant'; content: string }[]>>;
    handleSendChatRequest: (messageArray: { role: 'user' | 'assistant'; content: string }[]) => void;
}

export const ChatUI: React.FC<chatUIProps> = ({ isChatOpen, setIsChatOpen, messages, setMessages }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const offset = useRef({ x: 0, y: 0 });
    const [inputValue, setInputValue] = useState('');
    const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
    const chatRef = useRef<ChatMessageHandle>(null);

    const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
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

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            if (inputValue === "") return;
                sendMessage();
        }
    };

    const sendMessage = () => {
        if (isAwaitingResponse || inputValue.trim() === "") return;
        
        const userMessage: { role: 'user' | 'assistant'; content: string } = {
            role: 'user',
            content: inputValue.trim(),
        };
        
        const userMessages = [...messages, userMessage];
        chatRef.current?.setDisplayMessageArray(userMessages);
        setInputValue('');
        setIsAwaitingResponse(true);
        
        const thinkingMessage: { role: 'user' | 'assistant'; content: string } = {
            role: 'assistant',
            content: 'Thinking...',
        };
        
        setTimeout(() => {
            chatRef.current?.setDisplayMessageArray([...userMessages, thinkingMessage]);
        }, 200);
        
        try {
            console.log("Before called");
            chatRef.current?.handleSendChatRequest(userMessages);
        } finally {
            setIsAwaitingResponse(false);
        }
    };
    

    if (!isChatOpen) return null;

    const SendIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ pointerEvents: 'none' }}>
          <path d="M12 19V5" />
          <path d="M5 12l7-7 7 7" />
        </svg>
    );

    return (
        <div
        className="chat-floating"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        >
            <ChatHeader 
                setIsChatOpen={setIsChatOpen}
                onMouseDown={onMouseDown}
                setMessages={setMessages} 
            />
            <ChatMessage
                setMessages={setMessages} 
                messages={messages}
                ref={chatRef}
            />
            <div className="chat-input-bar">
                <input className="chat-input" 
                    placeholder="Ask a question" 
                    onKeyDown={handleKeyDown} value={inputValue}
                    onChange={e => setInputValue(e.target.value)}/>
                {isAwaitingResponse ? (
                    <div className="circle-loader"></div>
                    ) : (
                    <button className="chat-send-button" onClick={() => sendMessage()}>
                        <SendIcon />
                    </button>
                )}
            </div>
        </div>
    );
};
