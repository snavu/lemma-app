import React, { Dispatch, SetStateAction, forwardRef } from 'react';
import { ChatMessageHandle } from './chatMessage';
import './chatHeader.css';

interface ChatHeaderProps {
    setIsChatOpen: (bool: boolean) => void;
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
    setMessages: Dispatch<SetStateAction<{ role: 'user' | 'assistant'; content: string }[]>>;
    ChatMessageHandle: React.RefObject<ChatMessageHandle>;
}

export const ChatHeader = forwardRef<ChatMessageHandle, ChatHeaderProps>(
    ({ setIsChatOpen, onMouseDown, setMessages, ChatMessageHandle }, ref) => {

    const CloseIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );

    const TrashIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4h6v2" />
        </svg>
    );
    
      
    return (
        <div className="chat-header" onMouseDown={onMouseDown}>
            <div>Q&A Chat</div>
            <div className="chat-buttons">
                <button onClick={() => {
                    window.electron.agi.stopChatResponse();
                    setMessages([]); 
                    ChatMessageHandle.current?.setDisplayMessageArray([]);
                }} onMouseDown={(e) => e.stopPropagation()}>
                    <TrashIcon/>
                </button>
                <button onClick={() => {
                    setMessages(ChatMessageHandle.current?.getLatestMessages); 
                    setIsChatOpen(false); 
                    window.electron.agi.stopChatResponse();
                }} onMouseDown={(e) => e.stopPropagation()}><CloseIcon/></button>
            </div>
        </div>      
    );
});
