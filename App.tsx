import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage as ChatMessageType, Role } from './types';
import { getAgentResponse } from './services/geminiService';
import useSpeech from './hooks/useSpeech';
import ChatMessage from './components/ChatMessage';
import { SendIcon, MicIcon } from './components/Icons';

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agentThought, setAgentThought] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const { isListening, transcript, startListening, stopListening, speak } = useSpeech({
    onCommand: (command) => {
      setInput(command); // Show recognized command in input
      handleSubmit(command);
    },
  });

  useEffect(() => {
    // Show live transcript in the input field for better user feedback
    if (isListening) {
      setInput(transcript);
    }
  }, [transcript, isListening]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, agentThought]);

  const addMessage = (text: string, role: Role, isToolMessage = false) => {
    setMessages(prev => [...prev, { text, role, isToolMessage }]);
  };

  const handleSubmit = useCallback(async (query: string) => {
    if (!query.trim() || isLoading) return;
    
    stopListening(); // Stop listening if a submission is made
    setInput('');
    addMessage(query, 'user');
    setIsLoading(true);
    setAgentThought('Thinking...');

    try {
      const responseStream = getAgentResponse(query);

      let fullResponse = '';
      let toolResponseAdded = false;

      for await (const chunk of responseStream) {
        if (chunk.tool) {
          if (!toolResponseAdded) {
            setAgentThought(null);
            addMessage(`Using tool: ${chunk.tool}`, 'model', true);
            toolResponseAdded = true;
          }
        } else if (chunk.text) {
          if(agentThought) setAgentThought(null);
          fullResponse += chunk.text;
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.role === 'model' && !lastMessage.isToolMessage) {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = { ...lastMessage, text: fullResponse };
              return newMessages;
            } else {
              return [...prev, { text: fullResponse, role: 'model' }];
            }
          });
        }
      }
      speak(fullResponse);

    } catch (error) {
      console.error('Error with Gemini API:', error);
      addMessage('Sorry, I encountered an error. Please try again.', 'model');
    } finally {
      setIsLoading(false);
      setAgentThought(null);
    }
  }, [isLoading, speak, agentThought, stopListening]);
  
  const handleFormSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleSubmit(input);
  }

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="fixed bottom-8 right-8 h-[70vh] max-h-[700px] w-full max-w-md flex flex-col bg-gray-900/50 backdrop-blur-xl text-white font-sans rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
       <header className="p-4 border-b border-gray-700/50 shadow-lg bg-gray-800/30 flex-shrink-0">
        <h1 className="text-xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
          Surge AI Agent
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <ChatMessage key={index} message={msg} />
        ))}
        {agentThought && (
            <div className="flex items-start gap-3 justify-start animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <div className="w-6 h-6 bg-white/20 rounded-full animate-ping absolute"></div>
                </div>
                <div className="bg-gray-800/80 backdrop-blur-md rounded-2xl px-4 py-2 max-w-lg shadow-lg rounded-bl-none">
                    <p className="text-gray-300 italic">{agentThought}</p>
                </div>
            </div>
        )}
        <div ref={chatEndRef} />
      </main>

      <footer className="p-4 bg-gray-900/30 backdrop-blur-sm border-t border-gray-700/50">
        <form onSubmit={handleFormSubmit} className="flex items-center gap-2 bg-gray-800/70 border border-gray-700 rounded-full p-2 shadow-xl">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? "Say 'Hey Surge'..." : "Ask Surge anything..."}
            className="flex-1 bg-transparent focus:outline-none px-4"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={toggleListening}
            className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-500 hover:bg-blue-600'}`}
            disabled={isLoading}
          >
            <MicIcon />
          </button>
          <button
            type="submit"
            className="p-2 bg-purple-600 hover:bg-purple-700 rounded-full transition-colors disabled:bg-gray-600"
            disabled={isLoading || !input.trim()}
          >
            <SendIcon />
          </button>
        </form>
      </footer>
    </div>
  );
};

export default App;