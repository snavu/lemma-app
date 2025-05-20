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
      
    return (
        <div className="chat-header" onMouseDown={onMouseDown}>
            <div>Q&A Chat</div>
            <div className="chat-buttons">
                <button className="clear-button" onClick={() => ChatMessageHandle.current?.setDisplayMessageArray([])}>Clear</button>
                <button className="exit-button" onClick={() => {setIsChatOpen(false);}} onMouseDown={(e) => e.stopPropagation()}><CloseIcon/></button>
            </div>
        </div>      
    );
});
