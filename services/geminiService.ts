import { GoogleGenAI, FunctionDeclaration, Type, Chat, GenerateContentResponse, FunctionCall } from "@google/genai";

// Ensure API_KEY is available. In a real app, this would be handled more securely.
if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Tool Definitions
const calculatorTool: FunctionDeclaration = {
  name: 'calculator',
  parameters: {
    type: Type.OBJECT,
    description: 'Calculates the result of a mathematical expression.',
    properties: {
      expression: {
        type: Type.STRING,
        description: 'The mathematical expression to evaluate, e.g., "2 + 2" or "10 * (4 / 2)"',
      },
    },
    required: ['expression'],
  },
};

const weatherTool: FunctionDeclaration = {
  name: 'get_weather',
  parameters: {
    type: Type.OBJECT,
    description: 'Gets the current weather for a specified location.',
    properties: {
      location: {
        type: Type.STRING,
        description: 'The city and state, e.g., "San Francisco, CA"',
      },
    },
    required: ['location'],
  },
};

// This single `chat` instance maintains the conversation history (memory)
// for the duration of the app session, allowing the agent to have context.
const chat: Chat = ai.chats.create({
  model: 'gemini-2.5-flash',
  config: {
    systemInstruction: 'You are a helpful AI assistant named Surge. You can use tools to answer questions. Be concise.',
    tools: [{ functionDeclarations: [calculatorTool, weatherTool] }],
  },
});

// Tool Implementations
const executeCalculator = (expression: string): string => {
  try {
    // A safer way to evaluate math expressions than eval()
    const result = new Function(`return ${expression}`)();
    return result.toString();
  } catch (error) {
    return 'Invalid mathematical expression';
  }
};

const executeGetWeather = (location: string): string => {
  // Mock weather data for demonstration
  if (location.toLowerCase().includes('tokyo')) {
    return JSON.stringify({ location: 'Tokyo', temperature: '15°C', condition: 'Cloudy' });
  } else if (location.toLowerCase().includes('paris')) {
    return JSON.stringify({ location: 'Paris', temperature: '12°C', condition: 'Rainy' });
  } else {
    return JSON.stringify({ location, temperature: '22°C', condition: 'Sunny' });
  }
};

type AgentResponseChunk = { text?: string; tool?: string };

export async function* getAgentResponse(prompt: string): AsyncGenerator<AgentResponseChunk> {
  try {
    let stream = await chat.sendMessageStream({ message: prompt });
    let functionCalls: FunctionCall[] = [];
    let textContent = '';

    for await (const chunk of stream) {
        if (chunk.functionCalls) {
            functionCalls.push(...chunk.functionCalls);
        }
        if (chunk.text){
            textContent += chunk.text
        }
    }
    
    if (functionCalls.length > 0) {
        yield { tool: functionCalls[0].name };

        const toolResponses = functionCalls.map(fc => {
            let result: string;
            switch(fc.name) {
                case 'calculator':
                    result = executeCalculator(fc.args.expression);
                    break;
                case 'get_weather':
                    result = executeGetWeather(fc.args.location);
                    break;
                default:
                    result = `Unknown tool: ${fc.name}`;
            }
            return {
                id: fc.id,
                name: fc.name,
                response: { result },
            };
        });

        stream = await chat.sendMessageStream({ functionResponses: { functionResponses: toolResponses }});
        textContent = ''; // Reset text content for the new stream
         for await (const chunk of stream) {
            if (chunk.text){
                textContent += chunk.text
            }
        }
    }

    if(textContent){
        yield { text: textContent };
    }


  } catch (error) {
    console.error("Error in getAgentResponse:", error);
    yield { text: "An error occurred while processing your request." };
  }
}