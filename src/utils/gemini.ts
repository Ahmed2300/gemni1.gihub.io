import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { ImageData, DEFAULT_SYSTEM_INSTRUCTION } from '../types';

// Initialize the Gemini API
export const initializeGeminiAPI = (apiKey: string, model: string = "gemini-1.5-flash", customSystemInstruction?: string) => {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Use custom system instruction if provided, otherwise use default
    const systemInstruction = customSystemInstruction || DEFAULT_SYSTEM_INSTRUCTION;

    return genAI.getGenerativeModel({ 
      model,
      systemInstruction: systemInstruction
    });
  } catch (error) {
    console.error("Error initializing Gemini API:", error);
    throw new Error("Failed to initialize Gemini API. Please check your API key.");
  }
};

// Extract code blocks from markdown text
const extractCodeBlocks = (markdown: string) => {
  // Improved regex to better capture code blocks
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const codeBlocks = [];
  let match;

  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    codeBlocks.push({
      language: match[1]?.toLowerCase() || 'text',
      code: match[2].trim(),
    });
  }

  return codeBlocks;
};

// Convert images to the format expected by the Gemini API
const prepareImagesForGemini = (images: ImageData[]) => {
  return images.map(image => {
    // Extract the base64 data from the data URL
    const base64Data = image.dataUrl.split(',')[1];
    
    return {
      inlineData: {
        data: base64Data,
        mimeType: image.mimeType
      }
    };
  });
};

// Parse response parts to handle executable code blocks
const parseResponseParts = (parts: any[]) => {
  let textContent = '';
  const codeBlocks = [];
  
  parts.forEach(part => {
    if (part.text) {
      textContent += part.text;
    } else if (part.executable_code) {
      const language = part.executable_code.language.toLowerCase();
      const code = part.executable_code.code;
      
      // Add code block to the text content in markdown format
      textContent += `\n\`\`\`${language}\n${code}\n\`\`\`\n`;
      
      // Also track the code block separately
      codeBlocks.push({
        language,
        code
      });
    }
  });
  
  return { textContent, codeBlocks };
};

// Generate a streaming chat response
export const generateStreamingChatResponse = async (
  model: any,
  history: { role: string; parts: string }[],
  prompt: string,
  onChunk: (chunk: string, thinking?: string, codeBlocks?: any[]) => void,
  options: {
    enableCodeExecution?: boolean;
    enableThinking?: boolean;
    enableVision?: boolean;
    images?: ImageData[];
    systemInstruction?: string;
  } = {}
) => {
  try {
    // Configure safety settings
    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];

    // Configure generation config
    const generationConfig = {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 4096,
    };

    // Configure tools for code execution
    const tools = options.enableCodeExecution ? [
      {
        functionDeclarations: [{
          name: "run_code",
          description: "Runs code and returns the result",
          parameters: {
            type: "object",
            properties: {
              language: {
                type: "string",
                enum: ["python", "javascript"],
                description: "The programming language"
              },
              code: {
                type: "string",
                description: "The code to execute"
              }
            },
            required: ["language", "code"]
          }
        }]
      }
    ] : undefined;

    // Configure system instructions based on options
    let systemInstructions = options.systemInstruction || "";
    
    if (options.enableThinking && !systemInstructions.includes("thinking process")) {
      systemInstructions += "\nWhen answering complex questions, first explain your thinking process step by step before providing the final answer. Start with 'Let me think through this step by step:' and then provide your reasoning.";
    }
    
    if (options.enableCodeExecution && !systemInstructions.includes("code blocks")) {
      systemInstructions += `
When asked to provide code:
1. Always wrap code in proper markdown code blocks with the appropriate language tag
2. For example: \`\`\`javascript\n// Your code here\n\`\`\`
3. Provide complete, working solutions that can be executed directly
4. Include detailed comments explaining what the code does
5. After the code block, explain how the code works and what it accomplishes
6. If relevant, provide example usage or expected output
`;
    }
    
    if (options.enableVision && options.images && options.images.length > 0 && !systemInstructions.includes("analyzing images")) {
      systemInstructions += "\nYou are analyzing images provided by the user. Describe what you see in detail, including objects, people, text, colors, and any other relevant information. If multiple images are provided, compare and contrast them.";
    }

    // Add instructions for rich text formatting if not already included
    if (!systemInstructions.includes("rich text formatting")) {
      systemInstructions += `
Always use rich text formatting in your responses:
1. Use markdown tables with headers when presenting tabular data
2. Use **bold text** for important points
3. Use *italic* for emphasis
4. Use proper headings for structure
5. Format code with appropriate syntax highlighting using \`\`\`language\n code \`\`\` blocks
6. Use bullet points and numbered lists for organized information
`;
    }

    // Create chat instance with all configurations
    const chat = model.startChat({
      history: history,
      generationConfig,
      safetySettings,
      tools,
      systemInstruction: systemInstructions || undefined,
    });

    // For thinking mode, first get the thinking process
    let thinking = undefined;
    
    if (options.enableThinking) {
      try {
        // Request thinking process first
        const thinkingPrompt = `I need to answer this question: "${prompt}". Let me think through this step by step before answering.`;
        const thinkingResult = await chat.sendMessage(thinkingPrompt);
        thinking = thinkingResult.response.text();
        
        // Extract the thinking part from the response
        if (thinking) {
          const thinkingMatch = thinking.match(/Let me think through this step by step:([\s\S]*?)(?:In conclusion|Therefore|To summarize|In summary|The answer is)/i);
          if (thinkingMatch && thinkingMatch[1]) {
            thinking = thinkingMatch[1].trim();
          }
        }
      } catch (error) {
        console.error("Error generating thinking process:", error);
        // Continue without thinking if it fails
      }
    }

    // Now send the actual message for streaming
    let actualPrompt = options.enableCodeExecution 
      ? `${prompt}\n\nIf this requires calculation or code to solve, please write and execute the code to find the answer. Make sure to wrap all code in proper markdown code blocks with the appropriate language tag.`
      : prompt;
      
    // Prepare the content parts for the message
    const contentParts: any[] = [];
    
    // Add images if they exist and vision is enabled
    if (options.enableVision && options.images && options.images.length > 0) {
      const imageParts = prepareImagesForGemini(options.images);
      contentParts.push(...imageParts);
    }
    
    // Add the text prompt
    contentParts.push({ text: actualPrompt });
    
    // Send the message with all content parts
    const result = options.enableVision && options.images && options.images.length > 0
      ? await chat.sendMessageStream(contentParts)
      : await chat.sendMessageStream(actualPrompt);
    
    let fullResponse = '';
    let allCodeBlocks: any[] = [];
    
    for await (const chunk of result.stream) {
      // Check if the chunk has parts that might contain executable code
      if (chunk.parts && Array.isArray(chunk.parts)) {
        const { textContent, codeBlocks } = parseResponseParts(chunk.parts);
        fullResponse += textContent;
        
        // Add any new code blocks to our collection
        if (codeBlocks.length > 0) {
          allCodeBlocks = [...allCodeBlocks, ...codeBlocks];
        }
      } else {
        // Handle regular text chunks
        const chunkText = chunk.text();
        fullResponse += chunkText;
        
        // Also extract code blocks from markdown
        const markdownCodeBlocks = extractCodeBlocks(fullResponse);
        if (markdownCodeBlocks.length > 0) {
          // Merge with existing code blocks, avoiding duplicates
          allCodeBlocks = [...markdownCodeBlocks];
        }
      }
      
      // Pass the updated response and code blocks with each chunk
      onChunk(fullResponse, thinking, allCodeBlocks.length > 0 ? allCodeBlocks : undefined);
    }
    
    // Final extraction of code blocks to ensure we catch everything
    const finalCodeBlocks = extractCodeBlocks(fullResponse);
    if (finalCodeBlocks.length > 0) {
      allCodeBlocks = [...finalCodeBlocks];
    }
    
    onChunk(fullResponse, thinking, allCodeBlocks.length > 0 ? allCodeBlocks : undefined);
    
    return { response: fullResponse, thinking };
  } catch (error) {
    console.error("Error generating streaming chat response:", error);
    throw error;
  }
};

// Function to simulate code execution (in a real app, this would be handled by the API)
export const executeCode = async (language: string, code: string) => {
  // This is a simulation - in a real app, you would use the Gemini API's code execution capabilities
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        let result = '';
        
        if (language === 'python') {
          // Simulate Python execution
          if (code.includes('print')) {
            const printMatch = code.match(/print\(['"](.*)['"]\)/);
            result = printMatch ? printMatch[1] : 'Output from Python code';
          } else if (code.includes('sum') || code.includes('range')) {
            result = 'Calculated sum: 1275';
          } else if (code.includes('prime')) {
            result = 'Sum of first 50 primes: 5117';
          } else {
            result = 'Python code executed successfully';
          }
        } else if (language === 'javascript' || language === 'js') {
          // Simulate JavaScript execution
          if (code.includes('console.log')) {
            const logMatch = code.match(/console\.log\(['"](.*)['"]\)/);
            result = logMatch ? logMatch[1] : 'Output from JavaScript code';
          } else if (code.includes('Math.')) {
            result = 'Calculated result: 42';
          } else {
            result = 'JavaScript code executed successfully';
          }
        } else {
          result = `Executed ${language} code successfully`;
        }
        
        resolve({
          result,
          status: 'success'
        });
      } catch (error) {
        reject({
          result: `Error: ${error}`,
          status: 'error'
        });
      }
    },  1000); // Simulate execution delay
  });
};