import React, { useState } from 'react';
import { Bot, RefreshCw, Settings, MessageSquare } from 'lucide-react';
import ChatSettingsPanel from './ChatSettings';
import { ChatSettings } from '../types';

interface ChatHeaderProps {
  onReset: () => void;
  settings: ChatSettings;
  onSettingsChange: (settings: ChatSettings) => void;
  onToggleSidebar: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  onReset, 
  settings, 
  onSettingsChange,
  onToggleSidebar
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const toggleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen);
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200">
      <div className="flex items-center">
        <Bot size={24} className="text-blue-600 mr-2" />
        <h1 className="text-xl font-bold">Gemini Chat</h1>
      </div>
      <div className="flex items-center space-x-2">
        <div className="flex items-center">
          <div className="mr-2 text-sm text-gray-500">
            <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-1"></span>
            Online
          </div>
        </div>
        <button
          onClick={onToggleSidebar}
          className="flex items-center text-gray-600 hover:text-gray-900 p-2 rounded-md hover:bg-gray-100"
          title="Chat History"
        >
          <MessageSquare size={18} />
        </button>
        <ChatSettingsPanel 
          settings={settings}
          onSettingsChange={onSettingsChange}
          isOpen={isSettingsOpen}
          onToggle={toggleSettings}
        />
        <button
          onClick={onReset}
          className="flex items-center text-gray-600 hover:text-gray-900 p-2 rounded-md hover:bg-gray-100"
          title="Reset conversation"
        >
          <RefreshCw size={18} />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;