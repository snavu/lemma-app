import React, { Dispatch, SetStateAction, forwardRef, useState } from 'react';
import { ChatMessageHandle } from './chatMessage';
import './chatInput.css';

interface ChatInputProps {
    ChatMessageHandle: React.RefObject<ChatMessageHandle>;
}

export const ChatInput = forwardRef<ChatMessageHandle, ChatInputProps>(
    ({ChatMessageHandle}, ref) => {

    const [inputValue, setInputValue] = useState('');
    const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            if (inputValue === "") return;
                sendMessage();
        }
    };

    const sendMessage = async () => {
        if (isAwaitingResponse || inputValue.trim() === "") return;
        
        const userMessage: { role: 'user' | 'assistant'; content: string } = {
            role: 'user',
            content: inputValue.trim(),
        };
        
        const userMessages = [...ChatMessageHandle.current?.getLatestMessages(), userMessage];
        ChatMessageHandle.current?.setDisplayMessageArray(userMessages);
        setInputValue('');
        setIsAwaitingResponse(true);
        
        const thinkingMessage: { role: 'user' | 'assistant'; content: string } = {
            role: 'assistant',
            content: 'Thinking...',
        };
        
        setTimeout(() => {
            ChatMessageHandle.current?.setDisplayMessageArray([...userMessages, thinkingMessage]);
        }, 200);
        
        try {
            const latestMessages = ChatMessageHandle.current?.getLatestMessages();
            await ChatMessageHandle.current?.handleSendChatRequest([...latestMessages, userMessage]);
        } finally {
            setIsAwaitingResponse(false);
        }
    };

    const SendIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ pointerEvents: 'none' }}>
            <path d="M12 19V5" />
            <path d="M5 12l7-7 7 7" />
        </svg>
    );
      
    return (
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
    );
});
