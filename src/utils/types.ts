export interface Message {
  role: 'user' | 'model';
  parts: string;
  isStreaming?: boolean;
  thinking?: string;
  codeBlocks?: CodeBlock[];
  images?: ImageData[];
  timestamp?: number;
  hasImages?: boolean;
}

export interface ImageData {
  dataUrl: string;
  mimeType: string;
}

export interface CodeBlock {
  language: string;
  code: string;
  executionResult?: string;
  executionStatus?: 'success' | 'error';
}

export interface ChatState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  currentSessionId: string | null;
}

export interface ChatSettings {
  model: string;
  enableCodeExecution: boolean;
  enableThinking: boolean;
  enableVision: boolean;
  systemInstruction?: string;
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  supportsVision?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages?: Message[];
}

export const DEFAULT_SYSTEM_INSTRUCTION = `You are a helpful, accurate, and detailed AI assistant. Follow these guidelines in your responses:

1. When writing code:
   - Always provide complete, working code solutions with proper markdown code blocks
   - Include detailed comments explaining the code
   - Format code properly with appropriate syntax highlighting
   - Ensure code is efficient and follows best practices
   - When possible, include examples of how to use the code

2. For explanations:
   - Be clear, concise, and accurate
   - Use markdown formatting to improve readability
   - Break down complex concepts into understandable parts
   - Provide examples to illustrate points

3. For formatting:
   - Use markdown tables with headers when presenting tabular data
   - Use bold text for important points
   - Use italic text for emphasis
   - Use proper headings for structure
   - Use code blocks with language specification for all code

4. When answering questions:
   - Be comprehensive but focused on the question
   - Provide context when necessary
   - Cite sources when appropriate
   - Consider multiple perspectives when relevant`;

export const GEMINI_MODELS: ModelOption[] = [
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    description: "Fast and efficient for most tasks",
    supportsVision: true
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    description: "More powerful with higher quality responses",
    supportsVision: true
  },
  {
    id: "gemini-1.0-pro",
    name: "Gemini 1.0 Pro",
    description: "Original Gemini model"
  },
  {
    id: "gemini-1.0-pro-vision",
    name: "Gemini 1.0 Pro Vision",
    description: "Original Gemini model with vision capabilities",
    supportsVision: true
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    description: "Latest fast model with improved capabilities",
    supportsVision: true
  },
  {
    id: "gemini-2.0-flash-lite",
    name: "Gemini 2.0 Flash-Lite",
    description: "Lightweight version of Gemini 2.0 Flash"
  },
  {
    id: "gemini-2.0-pro-experimental-02-05",
    name: "Gemini 2.0 Pro Experimental",
    description: "Experimental version of Gemini 2.0 Pro",
    supportsVision: true
  },
  {
    id: "gemini-2.0-flash-thinking-experimental-01-21",
    name: "Gemini 2.0 Flash Thinking",
    description: "Experimental model with enhanced thinking capabilities"
  }
];