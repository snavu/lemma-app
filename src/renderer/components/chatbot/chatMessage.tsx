import React, {
  useRef,
  useEffect,
  useState,
  Dispatch,
  SetStateAction,
  forwardRef,
  useImperativeHandle,
} from 'react';
import Markdown from 'react-markdown';
import './chatMessage.css';

interface ChatMessageProps {
  messages: { role: 'user' | 'assistant'; content: string }[];
  isChatOpen: boolean;
}

export type ChatMessageHandle = {
  handleSendChatRequest: (messages: { role: 'user' | 'assistant'; content: string }[]) => void;
  setDisplayMessageArray: Dispatch<SetStateAction<{ role: 'user' | 'assistant'; content: string }[]>>;
  getLatestMessages: () => { role: 'user' | 'assistant'; content: string }[];
};

export const ChatMessage = forwardRef<ChatMessageHandle, ChatMessageProps>(
  ({ messages, isChatOpen }, ref) => {
  
  // automatically scrolls down when generating the message
  const bottomRef = useRef<HTMLDivElement>(null);
  // displays the current messages; doesn't story the history
  const [displayMessageArray, setDisplayMessageArray] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  // gets the most up to date messages from the array
  const displayMessageRef = useRef(displayMessageArray);


  /**
   * Sends a chat request to the assistant and streams the response tokens in real time.
   *
   * - Adds an empty assistant message to the display
   * - Appends incoming tokens to the latest assistant message as they arrive
   * - Cleans up listeners after the response is complete
   * - Sends the full message array to the backend via Electron
   *
   * @param messageArray - Array of chat messages including user and assistant roles
   */
  const handleSendChatRequest = async (messageArray: { role: 'user' | 'assistant'; content: string }[]) => {
    setDisplayMessageArray(prev => [...prev, { role: 'assistant', content: '' }]);
    let assistantMessage = '';

    window.electron.agi.onTokenReceived(token => {
      assistantMessage += token;
      setDisplayMessageArray(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: assistantMessage.trim() };
        return updated;
      });
    });

    window.electron.agi.onResponseDone(() => {
      console.log('remove stream listeners');
      window.electron.agi.removeStreamListeners();
    });

    try {
      await window.electron.agi.sendChatRequest(messageArray);
    } catch (err) {
      console.log("Error sending request to model: ", err);
    }
  };  

  // exposes these states to the parent component (chatbox.tsx)
  useImperativeHandle(ref, () => ({
    handleSendChatRequest,
    setDisplayMessageArray,
    getLatestMessages: () => displayMessageRef.current,
  }));

  /*  
  * makes sure displayMessageRef gets the latest array 
  * keeps scrolling down when streaming tokens
  */
  useEffect(() => {
    displayMessageRef.current = displayMessageArray;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessageArray]);

  // loads the message history to DisplayMessageArray when the chat opens
  useEffect(() => {
    setDisplayMessageArray(messages);
  }, [isChatOpen]);

    return (
      <div className="chat-messages-container">
        {displayMessageArray.map((msg, i) =>
          msg.content === 'Thinking...' ? (
            <div key={i} className="chat-message-bot chat-message">
              <div className="dot-loader"></div>
            </div>
          ) : (
            <div
              key={i}
              className={`chat-message ${msg.role === 'user' ? 'chat-message-user' : 'chat-message-bot'}`}
            >
              <Markdown>{msg.content}</Markdown>
            </div>
          )
        )}
        <div ref={bottomRef} />
      </div>
    );
  }
);
