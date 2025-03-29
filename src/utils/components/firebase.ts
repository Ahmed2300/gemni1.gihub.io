import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push, get, remove, update, query, orderByChild } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';
import { Message, ChatSession } from '../types';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAPcc5-enkHB4Qt5ZMB0KtxoVMQ8dMicuU",
  databaseURL: "https://wechat-9694d-default-rtdb.firebaseio.com/",
  projectId: "wechat-9694d",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Generate a unique user ID if not exists
const getUserId = (): string => {
  let userId = localStorage.getItem('chat_user_id');
  if (!userId) {
    userId = uuidv4();
    localStorage.setItem('chat_user_id', userId);
  }
  return userId;
};

// Save a new chat session
export const createChatSession = async (apiKey: string, title: string): Promise<string> => {
  const userId = getUserId();
  const sessionId = uuidv4();
  const sessionRef = ref(database, `chats/${userId}/${apiKey}/${sessionId}`);
  
  await set(sessionRef, {
    id: sessionId,
    title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  
  return sessionId;
};

// Update chat session title
export const updateChatSessionTitle = async (apiKey: string, sessionId: string, title: string): Promise<void> => {
  const userId = getUserId();
  const sessionRef = ref(database, `chats/${userId}/${apiKey}/${sessionId}`);
  
  await update(sessionRef, {
    title,
    updatedAt: Date.now(),
  });
};

// Get all chat sessions for an API key
export const getChatSessions = async (apiKey: string): Promise<ChatSession[]> => {
  const userId = getUserId();
  const sessionsRef = ref(database, `chats/${userId}/${apiKey}`);
  
  try {
    const snapshot = await get(sessionsRef);
    if (snapshot.exists()) {
      const sessions = snapshot.val();
      return Object.values(sessions).sort((a: any, b: any) => b.updatedAt - a.updatedAt);
    }
    return [];
  } catch (error) {
    console.error("Error getting chat sessions:", error);
    return [];
  }
};

// Delete a chat session
export const deleteChatSession = async (apiKey: string, sessionId: string): Promise<void> => {
  const userId = getUserId();
  const sessionRef = ref(database, `chats/${userId}/${apiKey}/${sessionId}`);
  
  await remove(sessionRef);
};

// Save messages to a chat session
export const saveMessages = async (apiKey: string, sessionId: string, messages: Message[]): Promise<void> => {
  const userId = getUserId();
  const messagesRef = ref(database, `chats/${userId}/${apiKey}/${sessionId}/messages`);
  
  // Filter out streaming messages and prepare messages for storage
  const storableMessages = messages.map(message => {
    // For images, we only store a flag that images were included, not the actual data
    // to avoid storing large base64 strings
    const hasImages = message.images && message.images.length > 0;
    
    // Store code blocks without execution results to save space
    const codeBlocks = message.codeBlocks ? message.codeBlocks.map(block => ({
      language: block.language,
      code: block.code
    })) : undefined;
    
    return {
      role: message.role,
      parts: message.parts,
      thinking: message.thinking,
      codeBlocks: codeBlocks,
      hasImages: hasImages,
      timestamp: Date.now()
    };
  }).filter(msg => !msg.isStreaming);
  
  await set(messagesRef, storableMessages);
  
  // Update the session's updatedAt timestamp and generate a title if it's the first message
  const sessionRef = ref(database, `chats/${userId}/${apiKey}/${sessionId}`);
  
  if (messages.length > 0 && messages[0].role === 'user') {
    // Use the first user message as the title (truncated)
    const title = messages[0].parts.length > 30 
      ? `${messages[0].parts.substring(0, 30)}...` 
      : messages[0].parts;
    
    await update(sessionRef, {
      updatedAt: Date.now(),
      title: title
    });
  } else {
    await update(sessionRef, {
      updatedAt: Date.now()
    });
  }
};

// Get messages for a chat session
export const getMessages = async (apiKey: string, sessionId: string): Promise<Message[]> => {
  const userId = getUserId();
  const messagesRef = ref(database, `chats/${userId}/${apiKey}/${sessionId}/messages`);
  
  try {
    const snapshot = await get(messagesRef);
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return [];
  } catch (error) {
    console.error("Error getting messages:", error);
    return [];
  }
};