import React, { useRef, useState, useEffect, useCallback } from 'react';
import './chatbot.css';

interface chatUIProps {
isChatOpen: boolean;
setIsChatOpen: (bool: boolean) => void;
}

export const ChatUI: React.FC<chatUIProps> = ({ isChatOpen, setIsChatOpen }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const offset = useRef({ x: 0, y: 0 });
    const [messages, setMessages] = useState<string[]>([]);
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
        setPosition({
            x: e.clientX - offset.current.x,
            y: e.clientY - offset.current.y,
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
            setMessages(prev => [...prev, inputValue.trim()]);
            setInputValue('');
            console.log('Enter pressed! Input value:', (e.target as HTMLInputElement).value);
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
                <div key={i} className="chat-messages">
                    {msg}
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
