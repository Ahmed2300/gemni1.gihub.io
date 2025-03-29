import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Trash2, X, Clock, Edit2 } from 'lucide-react';
import { ChatSession } from '../types';
import { getChatSessions, deleteChatSession, updateChatSessionTitle } from '../utils/firebase';

interface ChatSidebarProps {
  apiKey: string;
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  currentSessionId: string | null;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ 
  apiKey, 
  isOpen, 
  onClose, 
  onNewChat, 
  onSelectSession,
  currentSessionId
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    if (isOpen && apiKey) {
      loadSessions();
    }
  }, [isOpen, apiKey]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const chatSessions = await getChatSessions(apiKey);
      setSessions(chatSessions);
    } catch (error) {
      console.error("Error loading chat sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this chat?")) {
      try {
        await deleteChatSession(apiKey, sessionId);
        setSessions(sessions.filter(session => session.id !== sessionId));
        
        // If the current session was deleted, create a new one
        if (sessionId === currentSessionId) {
          onNewChat();
        }
      } catch (error) {
        console.error("Error deleting chat session:", error);
      }
    }
  };

  const startEditingTitle = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitle(session.title);
  };

  const saveEditedTitle = async (sessionId: string) => {
    if (editTitle.trim()) {
      try {
        await updateChatSessionTitle(apiKey, sessionId, editTitle);
        setSessions(sessions.map(session => 
          session.id === sessionId 
            ? { ...session, title: editTitle } 
            : session
        ));
      } catch (error) {
        console.error("Error updating chat title:", error);
      }
    }
    setEditingSessionId(null);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`fixed inset-y-0 right-0 w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-20 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Chat History</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={onNewChat}
            className="flex items-center justify-center w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} className="mr-2" />
            New Chat
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageSquare size={32} className="mx-auto mb-2 text-gray-400" />
              <p>No chat history yet</p>
              <p className="text-sm mt-1">Start a new conversation to see it here</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {sessions.map(session => (
                <li 
                  key={session.id} 
                  className={`hover:bg-gray-50 cursor-pointer ${currentSessionId === session.id ? 'bg-blue-50' : ''}`}
                  onClick={() => onSelectSession(session.id)}
                >
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      {editingSessionId === session.id ? (
                        <div className="flex-1 mr-2">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={() => saveEditedTitle(session.id)}
                            onKeyDown={(e) => e.key === 'Enter' && saveEditedTitle(session.id)}
                            className="w-full p-1 border border-gray-300 rounded"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className="flex-1 font-medium text-gray-800 truncate">
                          {session.title || 'New Chat'}
                        </div>
                      )}
                      <div className="flex items-center">
                        <button
                          onClick={(e) => startEditingTitle(e, session)}
                          className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                          aria-label="Edit title"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteSession(e, session.id)}
                          className="p-1 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100 ml-1"
                          aria-label="Delete chat"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <Clock size={12} className="mr-1" />
                      {formatDate(session.updatedAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;