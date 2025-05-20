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
    setMessages: Dispatch<SetStateAction<{ role: 'user' | 'assistant'; content: string }[]>>;
}

export type ChatMessageHandle = {
    handleSendChatRequest: (messages: { role: 'user' | 'assistant'; content: string }[]) => void;
    setDisplayMessageArray: Dispatch<SetStateAction<{ role: 'user' | 'assistant'; content: string }[]>>;
};

export const ChatMessage = forwardRef<ChatMessageHandle, ChatMessageProps>(
    ({ messages, setMessages }, ref) => {
        const bottomRef = useRef<HTMLDivElement>(null);


        const [displayMessageArray, setDisplayMessageArray] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);

        const handleSendChatRequest = async (messageArray: { role: 'user' | 'assistant'; content: string }[]) => {
            console.log("called");
            setDisplayMessageArray(prev => [...prev, { role: 'assistant', content: '' }]);
            console.log(displayMessageArray);
            let assistantMessage = '';

            window.electron.agi.onTokenReceived(token => {
                assistantMessage += token;
                console.log("TEST");
                setDisplayMessageArray(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'assistant', content: assistantMessage.trim() };
                    return updated;
                });
            });

            window.electron.agi.onResponseDone(() => {
                window.electron.agi.removeStreamListeners();
            });

            try {
                const assistantResult = await window.electron.agi.sendChatRequest(messageArray);
                // setMessages(prev => {
                //     const withoutThinking = prev.slice(0, -1);
                //     return [...withoutThinking, { role: 'assistant', content: assistantResult.response }];
                // });
            } catch (err) {
                console.log("Error sending request to model: ", err);
            }
        };

        useImperativeHandle(ref, () => ({
            handleSendChatRequest,
            setDisplayMessageArray,
        }));

        useEffect(() => {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }, [displayMessageArray]);

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
