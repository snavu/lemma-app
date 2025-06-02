import React, { Dispatch, SetStateAction, forwardRef, useState } from 'react';
import { ChatMessageHandle } from './chatMessage';
import './chatInput.css';

interface ChatInputProps {
  ChatMessageHandle: React.RefObject<ChatMessageHandle>;
}

export const ChatInput = forwardRef<ChatMessageHandle, ChatInputProps>(
  ({ChatMessageHandle}, ref) => {
  
  const [inputValue, setInputValue] = useState('');
  // makes sure that only one message can be sent at a time
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
  
  // Sends the message when the user hits enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (inputValue === "") return;
        sendMessage();
    }
  };

  /**
   * Sends the user's message and manages the assistant's response state.
   *
   * - Ignores empty input or if a response is already being processed
   * - Appends the user's message to the message array and clears the input field
   * - Shows a temporary "Thinking..." message to indicate the assistant is responding
   * - Sends the updated message array to the assistant handler
   * - Resets the awaiting-response flag once complete
   */
  const sendMessage = async () => {
    if (isAwaitingResponse || inputValue.trim() === "") return;
    
    const newMessage: { role: 'user' | 'assistant'; content: string } = {
      role: 'user',
      content: inputValue.trim(),
    };
    
    const newMessageArray = [...ChatMessageHandle.current?.getLatestMessages(), newMessage];
    ChatMessageHandle.current?.setDisplayMessageArray(newMessageArray);
    setInputValue('');
    setIsAwaitingResponse(true);
    
    // temporary message to display that the ai is generating its message
    const thinkingMessage: { role: 'user' | 'assistant'; content: string } = {
      role: 'assistant',
      content: 'Thinking...',
    };
    
    // wait for a bit to display the thinking message
    setTimeout(() => {
      ChatMessageHandle.current?.setDisplayMessageArray([...newMessageArray, thinkingMessage]);
    }, 200);
    
    // send the message without the thinking message to the AI
    try {
      const latestMessages = ChatMessageHandle.current?.getLatestMessages();
      console.log(latestMessages);
      await ChatMessageHandle.current?.handleSendChatRequest([...latestMessages, newMessage]);
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
