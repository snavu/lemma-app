import React, { useRef, useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import './chatbot.css';

interface chatUIProps {
    isChatOpen: boolean;
    setIsChatOpen: (bool: boolean) => void;
    messages: { sender: 'user' | 'bot'; text: string }[];
    setMessages: Dispatch<SetStateAction<{ sender: 'user' | 'bot'; text: string }[]>>;
}

export const ChatUI: React.FC<chatUIProps> = ({ isChatOpen, setIsChatOpen, messages, setMessages }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const offset = useRef({ x: 0, y: 0 });
    const [inputValue, setInputValue] = useState('');

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
            setMessages(prev => [...prev, { sender: 'user', text: inputValue.trim() }]);
            setInputValue('');
            // FOR TESTING UI
            setTimeout(() => {
                setMessages(prev => [...prev, { sender: 'bot', text: "test" }]);


            }, 1000);
        }
    };

    if (!isChatOpen) return null;

    return (
        <div
        className="chat-floating"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        >
            <div className="chat-header" onMouseDown={onMouseDown}>
                <span>Chat</span>
                <button onClick={() => setIsChatOpen(false)}>X</button>
            </div>
            <div className="chat-messages-container">
                {messages.map((msg, i) => (
                <div
                    key={i}
                    className={`chat-message ${msg.sender === 'user' ? 'chat-message-user' : 'chat-message-bot'}`}
                >
                    {msg.text}
                </div>
                ))}
            </div>
            <div className="chat-input-bar">
                <input className="chat-input" 
                    placeholder="Ask a question" 
                    onKeyDown={handleKeyDown} value={inputValue}
                    onChange={e => setInputValue(e.target.value)}/>
            </div>
        </div>
    );
};
