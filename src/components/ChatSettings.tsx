import React, { useState } from 'react';
import { Settings, Code, Brain, Image, FileText } from 'lucide-react';
import { ChatSettings, GEMINI_MODELS, DEFAULT_SYSTEM_INSTRUCTION } from '../types';

interface ChatSettingsProps {
  settings: ChatSettings;
  onSettingsChange: (settings: ChatSettings) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const ChatSettingsPanel: React.FC<ChatSettingsProps> = ({ 
  settings, 
  onSettingsChange, 
  isOpen,
  onToggle
}) => {
  const [showSystemInstructions, setShowSystemInstructions] = useState(false);
  const [systemInstruction, setSystemInstruction] = useState(
    settings.systemInstruction || DEFAULT_SYSTEM_INSTRUCTION
  );

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value;
    const selectedModel = GEMINI_MODELS.find(m => m.id === newModel);
    
    // If switching to a model that doesn't support vision, disable vision
    const enableVision = selectedModel?.supportsVision ? settings.enableVision : false;
    
    onSettingsChange({
      ...settings,
      model: newModel,
      enableVision
    });
  };

  const handleToggleCodeExecution = () => {
    onSettingsChange({
      ...settings,
      enableCodeExecution: !settings.enableCodeExecution
    });
  };

  const handleToggleThinking = () => {
    onSettingsChange({
      ...settings,
      enableThinking: !settings.enableThinking
    });
  };
  
  const handleToggleVision = () => {
    onSettingsChange({
      ...settings,
      enableVision: !settings.enableVision
    });
  };

  const handleSystemInstructionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSystemInstruction(e.target.value);
  };

  const handleSystemInstructionSave = () => {
    onSettingsChange({
      ...settings,
      systemInstruction: systemInstruction
    });
  };

  const handleSystemInstructionReset = () => {
    setSystemInstruction(DEFAULT_SYSTEM_INSTRUCTION);
    onSettingsChange({
      ...settings,
      systemInstruction: DEFAULT_SYSTEM_INSTRUCTION
    });
  };
  
  const currentModel = GEMINI_MODELS.find(m => m.id === settings.model);
  const supportsVision = currentModel?.supportsVision || false;

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center text-gray-600 hover:text-gray-900 p-2 rounded-md hover:bg-gray-100"
        title="Chat Settings"
      >
        <Settings size={18} />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-10 max-h-[80vh] overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Chat Settings</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <select
                value={settings.model}
                onChange={handleModelChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {GEMINI_MODELS.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {GEMINI_MODELS.find(m => m.id === settings.model)?.description}
              </p>
            </div>
            
            <div className="mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Code size={16} className="text-blue-600 mr-2" />
                  <label className="text-sm font-medium text-gray-700">
                    Code Execution
                  </label>
                </div>
                <div className="relative inline-block w-10 mr-2 align-middle select-none">
                  <input
                    type="checkbox"
                    id="toggle-code-execution"
                    checked={settings.enableCodeExecution}
                    onChange={handleToggleCodeExecution}
                    className="sr-only"
                  />
                  <label
                    htmlFor="toggle-code-execution"
                    className={`block overflow-hidden h-6 rounded-full cursor-pointer ${
                      settings.enableCodeExecution ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform ${
                        settings.enableCodeExecution ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    ></span>
                  </label>
                </div>
              </div>
              <p className="ml-6 mt-1 text-xs text-gray-500">
                Allow Gemini to execute code to solve problems
              </p>
            </div>
            
            <div className="mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Brain size={16} className="text-purple-600 mr-2" />
                  <label className="text-sm font-medium text-gray-700">
                    Thinking
                  </label>
                </div>
                <div className="relative inline-block w-10 mr-2 align-middle select-none">
                  <input
                    type="checkbox"
                    id="toggle-thinking"
                    checked={settings.enableThinking}
                    onChange={handleToggleThinking}
                    className="sr-only"
                  />
                  <label
                    htmlFor="toggle-thinking"
                    className={`block overflow-hidden h-6 rounded-full cursor-pointer ${
                      settings.enableThinking ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform ${
                        settings.enableThinking ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    ></span>
                  </label>
                </div>
              </div>
              <p className="ml-6 mt-1 text-xs text-gray-500">
                Show Gemini's thinking process before answering
              </p>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Image size={16} className="text-green-600 mr-2" />
                  <label className="text-sm font-medium text-gray-700">
                    Vision
                  </label>
                </div>
                <div className="relative inline-block w-10 mr-2 align-middle select-none">
                  <input
                    type="checkbox"
                    id="toggle-vision"
                    checked={settings.enableVision && supportsVision}
                    onChange={handleToggleVision}
                    disabled={!supportsVision}
                    className="sr-only"
                  />
                  <label
                    htmlFor="toggle-vision"
                    className={`block overflow-hidden h-6 rounded-full cursor-pointer ${
                      settings.enableVision && supportsVision ? 'bg-green-600' : 'bg-gray-300'
                    } ${!supportsVision ? 'opacity-50' : ''}`}
                  >
                    <span
                      className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform ${
                        settings.enableVision && supportsVision ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    ></span>
                  </label>
                </div>
              </div>
              <p className={`ml-6 mt-1 text-xs ${!supportsVision ? 'text-red-500' : 'text-gray-500'}`}>
                {!supportsVision 
                  ? 'Current model does not support vision capabilities' 
                  : 'Enable image analysis capabilities'}
              </p>
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText size={16} className="text-orange-600 mr-2" />
                  <label className="text-sm font-medium text-gray-700">
                    System Instructions
                  </label>
                </div>
                <button
                  onClick={() => setShowSystemInstructions(!showSystemInstructions)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded"
                >
                  {showSystemInstructions ? 'Hide' : 'Edit'}
                </button>
              </div>
              <p className="ml-6 mt-1 text-xs text-gray-500">
                Customize how Gemini responds to your prompts
              </p>
            </div>

            {showSystemInstructions && (
              <div className="mt-3 border-t pt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom System Instructions
                </label>
                <textarea
                  value={systemInstruction}
                  onChange={handleSystemInstructionChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                  rows={10}
                  placeholder="Enter custom instructions for the AI model..."
                />
                <div className="flex justify-between mt-2">
                  <button
                    onClick={handleSystemInstructionReset}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded"
                  >
                    Reset to Default
                  </button>
                  <button
                    onClick={handleSystemInstructionSave}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
                  >
                    Save Instructions
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  These instructions guide how the AI responds to your messages. Changes will apply to new messages only.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatSettingsPanel;