
import React from 'react';
import { ChatMessage } from '../types';
import { UserIcon, AgentIcon, ToolIcon, VolumeUpIcon } from './Icons';

interface ChatMessageProps {
  message: ChatMessage;
}

const ChatMessageComponent: React.FC<ChatMessageProps> = ({ message }) => {
  const { text, role, isToolMessage } = message;
  const isUser = role === 'user';

  const speakText = () => {
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  if (isToolMessage) {
    return (
      <div className="flex items-center justify-center gap-2 my-2 text-sm text-gray-400">
        <ToolIcon />
        <span>{text}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg">
          <AgentIcon />
        </div>
      )}
      <div
        className={`rounded-2xl px-4 py-2 max-w-lg shadow-lg relative group
          ${isUser
            ? 'bg-blue-600/80 backdrop-blur-md rounded-br-none'
            : 'bg-gray-800/80 backdrop-blur-md rounded-bl-none'
          }`}
      >
        <p className="whitespace-pre-wrap">{text}</p>
        {!isUser && text && (
            <button 
                onClick={speakText} 
                className="absolute -bottom-3 -right-3 p-1.5 bg-gray-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <VolumeUpIcon />
            </button>
        )}
      </div>
       {isUser && (
        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 shadow-lg">
          <UserIcon />
        </div>
      )}
    </div>
  );
};

export default ChatMessageComponent;
