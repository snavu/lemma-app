import React, { useRef, useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import './chatbot.css';
import Markdown from 'react-markdown';

interface chatUIProps {
    isChatOpen: boolean;
    setIsChatOpen: (bool: boolean) => void;
    messages: { role: 'user' | 'assistant'; content: string }[];
    setMessages: Dispatch<SetStateAction<{ role: 'user' | 'assistant'; content: string }[]>>;
    handleSendChatRequest: (messageArray: { role: 'user' | 'assistant'; content: string }[]) => void;
}

export const ChatUI: React.FC<chatUIProps> = ({ isChatOpen, setIsChatOpen, messages, setMessages, handleSendChatRequest }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const offset = useRef({ x: 0, y: 0 });
    const [inputValue, setInputValue] = useState('');
    const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

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

    const sendMessage = async () => {
        if (isAwaitingResponse || inputValue.trim() === "") return;
        
        const userMessage: { role: 'user' | 'assistant'; content: string } = {
            role: 'user',
            content: inputValue.trim(),
        };
        
        const userMessages = [...messages, userMessage];
        setMessages(userMessages);
        setInputValue('');
        setIsAwaitingResponse(true);
        
        const thinkingMessage: { role: 'user' | 'assistant'; content: string } = {
            role: 'assistant',
            content: 'Thinking...',
        };
        
        setTimeout(() => {
            setMessages([...userMessages, thinkingMessage]);
        }, 200);
        
        try {
            await handleSendChatRequest(userMessages);
        } finally {
            setIsAwaitingResponse(false);
        }
    };
      

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            if (inputValue === "") return;
                sendMessage();
        }
    };

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, [messages]);
    

    if (!isChatOpen) return null;

    const SendIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ pointerEvents: 'none' }}>
          <path d="M12 19V5" />
          <path d="M5 12l7-7 7 7" />
        </svg>
    );

    const CloseIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
      
    return (
        <div
        className="chat-floating"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        >
            <div className="chat-header" onMouseDown={onMouseDown}>
                <div>Q&A Chat</div>
                <div className="chat-buttons">
                    <button className="clear-button" onClick={() => setMessages([])}>Clear</button>
                    <button className="exit-button" onClick={() => {setIsChatOpen(false);}} onMouseDown={(e) => e.stopPropagation()}><CloseIcon/></button>
                </div>
            </div>
            <div className="chat-messages-container">
            {messages.map((msg, i) =>
                msg.content === 'Thinking...' ? (
                    <div className="chat-message-bot chat-message"><div key={i} className="dot-loader"></div></div>
                ) : (
                    <div
                        key={i}
                        className={`chat-message ${msg.role === 'user' ? 'chat-message-user' : 'chat-message-bot'}`}>
                        <Markdown>{msg.content}</Markdown>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
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
