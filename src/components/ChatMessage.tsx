import React, { useState } from 'react';
import { Bot, User, Brain, Code, Play, CheckCircle, XCircle, Image } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message, CodeBlock } from '../types';
import { executeCode } from '../utils/gemini';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [showThinking, setShowThinking] = useState(false);
  const [executingCodeIndex, setExecutingCodeIndex] = useState<number | null>(null);
  const [codeBlocks, setCodeBlocks] = useState<CodeBlock[]>(message.codeBlocks || []);
  const [imageError, setImageError] = useState<Record<number, boolean>>({});

  // Function to handle code execution
  const handleExecuteCode = async (code: string, language: string, index: number) => {
    setExecutingCodeIndex(index);
    
    try {
      // Call the executeCode function from utils/gemini
      const result = await executeCode(language, code);
      
      // Update the code block with execution result
      const updatedCodeBlocks = [...codeBlocks];
      updatedCodeBlocks[index] = {
        ...updatedCodeBlocks[index],
        executionResult: result.result,
        executionStatus: result.status as 'success' | 'error'
      };
      
      setCodeBlocks(updatedCodeBlocks);
    } catch (error) {
      // Handle execution error
      const updatedCodeBlocks = [...codeBlocks];
      updatedCodeBlocks[index] = {
        ...updatedCodeBlocks[index],
        executionResult: `Error: ${error}`,
        executionStatus: 'error'
      };
      
      setCodeBlocks(updatedCodeBlocks);
    } finally {
      setExecutingCodeIndex(null);
    }
  };

  // Function to handle image load errors
  const handleImageError = (index: number) => {
    setImageError(prev => ({
      ...prev,
      [index]: true
    }));
  };

  // Function to render code blocks with execution buttons
  const renderCodeBlocks = () => {
    if (!codeBlocks || codeBlocks.length === 0) return null;
    
    return (
      <div className="mt-4 space-y-4">
        {codeBlocks.map((block, index) => (
          <div key={index} className="bg-gray-50 rounded-md border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between bg-gray-100 px-4 py-2">
              <div className="flex items-center">
                <Code size={16} className="text-blue-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">{block.language}</span>
              </div>
              <button
                onClick={() => handleExecuteCode(block.code, block.language, index)}
                disabled={executingCodeIndex === index}
                className="flex items-center text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:bg-blue-300"
              >
                {executingCodeIndex === index ? (
                  <>
                    <div className="animate-spin h-3 w-3 border-2 border-white border-r-transparent rounded-full mr-1"></div>
                    Executing...
                  </>
                ) : (
                  <>
                    <Play size={12} className="mr-1" />
                    Run Code
                  </>
                )}
              </button>
            </div>
            <SyntaxHighlighter 
              language={block.language} 
              style={oneDark}
              customStyle={{ margin: 0, padding: '1rem' }}
            >
              {block.code}
            </SyntaxHighlighter>
            {block.executionResult && (
              <div className="px-4 py-3 text-sm">
                <div className="flex items-center mb-1">
                  <span>
                    {block.executionStatus === 'success' ? (
                      <CheckCircle size={16} className="text-green-500 mr-1" />
                    ) : (
                      <XCircle size={16} className="text-red-500 mr-1" />
                    )}
                  </span>
                  <span className="font-medium">Output:</span>
                </div>
                <div className="font-mono bg-gray-50 p-2 rounded border border-gray-200">
                  {block.executionResult}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Function to render uploaded images
  const renderImages = () => {
    if (!message.images || message.images.length === 0) return null;
    
    return (
      <div className="mt-2 mb-3">
        <div className="flex items-center mb-2">
          <Image size={16} className="text-blue-600 mr-2" />
          <span className="text-sm font-medium text-gray-700">
            {message.images.length > 1 ? `${message.images.length} Images` : '1 Image'}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {message.images.map((image, index) => (
            <div key={index} className="relative">
              {!imageError[index] ? (
                <img 
                  src={image.dataUrl} 
                  alt={`Uploaded ${index + 1}`} 
                  className="max-h-48 max-w-full object-contain rounded-md border border-gray-300" 
                  onError={() => handleImageError(index)}
                />
              ) : (
                <div className="flex items-center justify-center h-48 w-48 bg-gray-100 rounded-md border border-gray-300 text-gray-500">
                  <div className="text-center p-2">
                    <Image size={24} className="mx-auto mb-2" />
                    <p className="text-xs">Image could not be displayed</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`flex gap-3 p-4 ${isUser ? 'bg-gray-50' : 'bg-white'} border-b border-gray-100`}>
      <div className="flex-shrink-0 mt-1">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-blue-100' : 'bg-blue-100'}`}>
          {isUser ? <User size={16} className="text-blue-600" /> : <Bot size={16} className="text-blue-600" />}
        </div>
      </div>
      <div className="flex-1 max-w-[calc(100%-3rem)]">
        <div className="font-medium mb-1 text-sm text-gray-600">{isUser ? 'You' : 'Gemini'}</div>
        <div className="prose prose-sm max-w-none">
          {isUser ? (
            <>
              <div className="py-1 px-3 bg-gray-100 inline-block rounded-2xl text-gray-800">
                {message.parts}
              </div>
              {renderImages()}
            </>
          ) : (
            <>
              {message.thinking && (
                <div className="mb-4">
                  <button 
                    onClick={() => setShowThinking(!showThinking)}
                    className="flex items-center text-sm text-purple-600 hover:text-purple-800 mb-2"
                  >
                    <Brain size={16} className="mr-1" />
                    {showThinking ? 'Hide thinking process' : 'Show thinking process'}
                  </button>
                  
                  {showThinking && (
                    <div className="bg-purple-50 p-3 rounded-md border border-purple-100 text-sm text-gray-700 mb-3">
                      <ReactMarkdown
                        components={{
                          p: ({ node, ...props }) => <p className="my-1" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc pl-4 my-1" {...props} />,
                          li: ({ node, ...props }) => <li className="my-0.5" {...props} />,
                        }}
                      >
                        {message.thinking}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              )}
              <div className="py-3 px-4 bg-gray-100 rounded-2xl text-gray-800">
                <ReactMarkdown
                  components={{
                    h1: ({ node, ...props }) => <h1 className="text-2xl font-bold my-4" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-xl font-bold my-3" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-lg font-bold my-2" {...props} />,
                    p: ({ node, ...props }) => <p className="my-2" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc pl-6 my-2" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal pl-6 my-2" {...props} />,
                    li: ({ node, ...props }) => <li className="my-1" {...props} />,
                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2" {...props} />,
                    code: ({ node, inline, className, children, ...props }) => {
                      if (inline) {
                        return <code className="bg-gray-200 px-1 py-0.5 rounded text-red-600 font-mono text-sm" {...props}>{children}</code>;
                      }
                      // We'll handle code blocks separately with our custom renderer
                      return null;
                    },
                    pre: ({ node, ...props }) => {
                      // Skip pre tags as we're handling code blocks separately
                      return null;
                    },
                    strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                    em: ({ node, ...props }) => <em className="italic" {...props} />,
                    a: ({ node, ...props }) => <a className="text-blue-600 hover:underline" {...props} />,
                    table: ({ node, ...props }) => <table className="border-collapse border border-gray-300 my-4 w-full" {...props} />,
                    thead: ({ node, ...props }) => <thead className="bg-gray-200" {...props} />,
                    tbody: ({ node, ...props }) => <tbody {...props} />,
                    tr: ({ node, ...props }) => <tr className="border-b border-gray-300" {...props} />,
                    th: ({ node, ...props }) => <th className="border border-gray-300 px-4 py-2 text-left" {...props} />,
                    td: ({ node, ...props }) => <td className="border border-gray-300 px-4 py-2" {...props} />,
                    hr: () => <hr className="my-4 border-t border-gray-300" />,
                  }}
                >
                  {message.parts}
                </ReactMarkdown>
              </div>
              
              {/* Render code blocks with execution buttons */}
              {renderCodeBlocks()}
            </>
          )}
        </div>
        {message.isStreaming && (
          <div className="mt-1">
            <div className="inline-block h-3 w-3 animate-pulse rounded-full bg-blue-500 mr-1"></div>
            <div className="inline-block h-3 w-3 animate-pulse rounded-full bg-blue-500 mr-1" style={{ animationDelay: '0.2s' }}></div>
            <div className="inline-block h-3 w-3 animate-pulse rounded-full bg-blue-500" style={{ animationDelay: '0.4s' }}></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;