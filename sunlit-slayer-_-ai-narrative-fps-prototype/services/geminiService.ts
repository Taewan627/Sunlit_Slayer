
import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini API client strictly using the environment variable.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getCommanderMessage = async (wave: number, status: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a battlefield commander in a sunny zombie apocalypse. 
      The player is at Wave ${wave}. Current game status: ${status}. 
      Give a very short (1 sentence), encouraging, yet gritty message to the player. 
      Respond ONLY with the message text.`,
      config: {
        maxOutputTokens: 50,
        // When maxOutputTokens is set, thinkingBudget should be specified to avoid empty responses.
        // We set it to 0 as complex reasoning is not required for this simple text task.
        thinkingConfig: { thinkingBudget: 0 },
        temperature: 0.7,
      }
    });
    return response.text || "Keep firing, soldier! Don't let them get close!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Eyes up! More incoming!";
  }
};
