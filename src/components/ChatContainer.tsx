import React, { useState, useEffect, useRef } from 'react';
import { Bot, MessageSquare } from 'lucide-react';
import ChatHeader from './ChatHeader';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ChatSidebar from './ChatSidebar';
import { Message, ChatState, ChatSettings, GEMINI_MODELS, CodeBlock, ImageData, DEFAULT_SYSTEM_INSTRUCTION } from '../types';
import { initializeGeminiAPI, generateStreamingChatResponse } from '../utils/gemini';
import { 
  createChatSession, 
  saveMessages, 
  getMessages, 
  getChatSessions 
} from '../utils/firebase';

interface ChatContainerProps {
  apiKey: string;
  onReset: () => void;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ apiKey, onReset }) => {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    loading: false,
    error: null,
    currentSessionId: null
  });

  const [settings, setSettings] = useState<ChatSettings>({
    model: "gemini-1.5-flash",
    enableCodeExecution: false,
    enableThinking: false,
    enableVision: true,
    systemInstruction: DEFAULT_SYSTEM_INSTRUCTION
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const model = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeModelWithApiKey();
    initializeSession();
  }, [apiKey, settings.model, settings.systemInstruction]);

  const initializeModelWithApiKey = () => {
    try {
      model.current = initializeGeminiAPI(apiKey, settings.model, settings.systemInstruction);
    } catch (error) {
      setChatState(prev => ({
        ...prev,
        error: 'Failed to initialize Gemini API. Please check your API key.'
      }));
    }
  };

  const initializeSession = async () => {
    try {
      // Check if there are existing sessions
      const sessions = await getChatSessions(apiKey);
      
      if (sessions.length > 0) {
        // Load the most recent session
        const mostRecentSession = sessions[0];
        const messages = await getMessages(apiKey, mostRecentSession.id);
        
        setChatState(prev => ({
          ...prev,
          messages: messages || [],
          currentSessionId: mostRecentSession.id
        }));
      } else {
        // Create a new session if none exist
        createNewSession();
      }
    } catch (error) {
      console.error("Error initializing session:", error);
      // Create a new session if there was an error
      createNewSession();
    }
  };

  const createNewSession = async () => {
    try {
      const sessionId = await createChatSession(apiKey, "New Chat");
      setChatState(prev => ({
        ...prev,
        messages: [],
        currentSessionId: sessionId
      }));
    } catch (error) {
      console.error("Error creating new session:", error);
      setChatState(prev => ({
        ...prev,
        error: 'Failed to create a new chat session.'
      }));
    }
  };

  const loadSession = async (sessionId: string) => {
    try {
      const messages = await getMessages(apiKey, sessionId);
      setChatState(prev => ({
        ...prev,
        messages: messages || [],
        currentSessionId: sessionId
      }));
      setIsSidebarOpen(false);
      
      // Scroll to bottom after loading messages
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (error) {
      console.error("Error loading session:", error);
      setChatState(prev => ({
        ...prev,
        error: 'Failed to load the selected chat session.'
      }));
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatState.messages]);

  useEffect(() => {
    // Save messages to Firebase whenever they change
    if (chatState.currentSessionId && chatState.messages.length > 0) {
      saveMessages(apiKey, chatState.currentSessionId, chatState.messages);
    }
  }, [chatState.messages, chatState.currentSessionId, apiKey]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSettingsChange = (newSettings: ChatSettings) => {
    setSettings(newSettings);
    // Reinitialize the model if it changed or if system instructions changed
    if (newSettings.model !== settings.model || newSettings.systemInstruction !== settings.systemInstruction) {
      try {
        model.current = initializeGeminiAPI(apiKey, newSettings.model, newSettings.systemInstruction);
      } catch (error) {
        setChatState(prev => ({
          ...prev,
          error: 'Failed to initialize Gemini API with the selected model or instructions.'
        }));
      }
    }
  };

  const handleSendMessage = async (message: string, images?: ImageData[]) => {
    if (!model.current) {
      setChatState(prev => ({
        ...prev,
        error: 'Gemini API not initialized. Please check your API key or try again.'
      }));
      return;
    }

    // Create a new session if none exists
    if (!chatState.currentSessionId) {
      await createNewSession();
    }

    // Add user message
    const userMessage: Message = { 
      role: 'user', 
      parts: message,
      images: images 
    };
    
    // Add empty model message that will be streamed
    const modelMessage: Message = { role: 'model', parts: '', isStreaming: true };
    
    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage, modelMessage],
      loading: true,
      error: null,
    }));

    try {
      // Format history for Gemini API (excluding the empty model message we just added)
      const history = chatState.messages.map(msg => ({
        role: msg.role,
        parts: msg.parts,
      }));

      // Generate streaming response
      await generateStreamingChatResponse(
        model.current, 
        history, 
        message,
        (chunk, thinking, codeBlocks) => {
          // Update the model message with each chunk
          setChatState(prev => {
            const updatedMessages = [...prev.messages];
            const lastMessageIndex = updatedMessages.length - 1;
            
            updatedMessages[lastMessageIndex] = {
              ...updatedMessages[lastMessageIndex],
              parts: chunk,
              thinking: thinking,
              codeBlocks: codeBlocks,
            };
            
            return {
              ...prev,
              messages: updatedMessages,
            };
          });
        },
        {
          enableCodeExecution: settings.enableCodeExecution,
          enableThinking: settings.enableThinking,
          enableVision: settings.enableVision,
          images: images,
          systemInstruction: settings.systemInstruction
        }
      );
      
      // Mark streaming as complete
      setChatState(prev => {
        const updatedMessages = [...prev.messages];
        const lastMessageIndex = updatedMessages.length - 1;
        
        updatedMessages[lastMessageIndex] = {
          ...updatedMessages[lastMessageIndex],
          isStreaming: false,
        };
        
        return {
          ...prev,
          messages: updatedMessages,
          loading: false,
        };
      });
    } catch (error) {
      console.error('Error generating response:', error);
      setChatState(prev => {
        const updatedMessages = [...prev.messages];
        // Remove the empty model message if there was an error
        updatedMessages.pop();
        
        return {
          ...prev,
          messages: updatedMessages,
          loading: false,
          error: 'Failed to generate response. Please check your API key and ensure it has access to the selected model.'
        };
      });
    }
  };

  const handleReset = () => {
    createNewSession();
    onReset();
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const currentModel = GEMINI_MODELS.find(m => m.id === settings.model);
  const supportsVision = currentModel?.supportsVision || false;

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-md overflow-hidden relative">
      <ChatHeader 
        onReset={handleReset} 
        settings={settings}
        onSettingsChange={handleSettingsChange}
        onToggleSidebar={toggleSidebar}
      />
      
      <div className="flex-1 overflow-y-auto p-0">
        {chatState.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <Bot size={48} className="text-blue-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Welcome to Gemini Chat</h2>
            <p className="text-gray-500 max-w-md mb-4">
              Start a conversation with Gemini. You can ask questions, get creative ideas, or just chat!
            </p>
            
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 max-w-md text-left mb-4">
              <p className="text-sm font-medium text-blue-800 mb-2">Current Settings:</p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Model: {GEMINI_MODELS.find(m => m.id === settings.model)?.name}</li>
                <li>• Code Execution: {settings.enableCodeExecution ? 'Enabled' : 'Disabled'}</li>
                <li>• Thinking Process: {settings.enableThinking ? 'Enabled' : 'Disabled'}</li>
                <li>• Vision Capabilities: {settings.enableVision && supportsVision ? 'Enabled' : 'Disabled'}</li>
                <li>• Custom System Instructions: {settings.systemInstruction !== DEFAULT_SYSTEM_INSTRUCTION ? 'Customized' : 'Default'}</li>
              </ul>
              <p className="text-xs text-blue-600 mt-2">
                You can change these settings using the gear icon in the top right.
              </p>
            </div>
            
            <div className="mt-2 bg-gray-50 p-4 rounded-lg border border-gray-200 max-w-md text-left">
              <p className="text-sm font-medium text-gray-700 mb-2">Try these examples:</p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• "Write a short story about a robot learning to paint"</li>
                <li>• "Explain quantum computing in simple terms"</li>
                <li>• "Create a JavaScript function to sort an array of objects"</li>
                <li>• "What are some creative ways to reuse plastic bottles?"</li>
                <li>• "Create a table comparing different programming languages"</li>
                <li>• "Format a recipe with bold ingredients and italic instructions"</li>
                {settings.enableCodeExecution && (
                  <>
                    <li>• "Calculate the sum of the first 50 prime numbers"</li>
                    <li>• "Generate a Python function to check if a string is a palindrome"</li>
                  </>
                )}
                {settings.enableVision && supportsVision && (
                  <>
                    <li>• Upload an image and ask "What's in this image?"</li>
                    <li>• Upload multiple images and ask "Compare these images"</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        ) : (
          chatState.messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))
        )}
        
        {chatState.loading && !chatState.messages.some(msg => msg.isStreaming) && (
          <div className="p-4 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
            <p className="mt-2 text-sm text-gray-500">Gemini is thinking...</p>
          </div>
        )}
        
        {chatState.error && (
          <div className="p-4 m-4 bg-red-50 text-red-600 rounded-md">
            <p>{chatState.error}</p>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <ChatInput 
        onSendMessage={handleSendMessage} 
        disabled={chatState.loading} 
        enableVision={settings.enableVision && supportsVision}
      />

      {/* Chat History Sidebar */}
      <ChatSidebar 
        apiKey={apiKey}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNewChat={createNewSession}
        onSelectSession={loadSession}
        currentSessionId={chatState.currentSessionId}
      />
      
      {/* Overlay when sidebar is open on mobile */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default ChatContainer;