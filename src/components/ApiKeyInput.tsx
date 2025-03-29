import React, { useState } from 'react';
import { Key } from 'lucide-react';

interface ApiKeyInputProps {
  onApiKeySubmit: (apiKey: string) => void;
}

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ onApiKeySubmit }) => {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }
    
    // Basic validation for API key format
    if (!apiKey.trim().startsWith('AI') && !apiKey.trim().match(/^[A-Za-z0-9_-]{30,}$/)) {
      setError('Invalid API key format. Please check your key and try again.');
      return;
    }
    
    setError(null);
    onApiKeySubmit(apiKey.trim());
  };

  const handleAnonymousLogin = () => {
    onApiKeySubmit("AIzaSyAwyZvBEcMI0e9XXyskHSzj1sjgq5bJUtg");
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-center mb-6">
        <Key size={32} className="text-blue-600 mr-2" />
        <h2 className="text-xl font-bold">Enter your Gemini API Key</h2>
      </div>
      
      <p className="mb-4 text-gray-600">
        To use this chat app, you need a Google Gemini API key. You can get one for free at{' '}
        <a 
          href="https://aistudio.google.com/app/apikey" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Google AI Studio
        </a>.
      </p>
      
      <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-100">
        <h3 className="font-medium text-blue-800 mb-1">How to get your API key:</h3>
        <ol className="text-sm text-blue-700 list-decimal pl-5 space-y-1">
          <li>Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a></li>
          <li>Sign in with your Google account</li>
          <li>Click on "Get API key" or "Create API key"</li>
          <li>Copy the generated API key</li>
          <li>Paste it in the field below</li>
        </ol>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setError(null);
            }}
            placeholder="Paste your API key here"
            className={`w-full p-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
            required
          />
          {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={!apiKey.trim()}
          className={`w-full p-2 rounded-md ${
            !apiKey.trim()
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          Start Chatting
        </button>
      </form>
      
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600 mb-2">- OR -</p>
        <button
          onClick={handleAnonymousLogin}
          className="w-full p-2 rounded-md bg-green-600 text-white hover:bg-green-700"
        >
          Try Anonymously
        </button>
      </div>
      
      <div className="mt-4 text-xs text-gray-500">
        <p className="mb-2">Your API key is stored locally in your browser and is never sent to our servers.</p>
        <p className="font-medium">Note: Make sure your API key has access to the Gemini models you want to use.</p>
      </div>
    </div>
  );
};

export default ApiKeyInput;