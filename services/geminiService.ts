
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateBirthdayWish = async (name: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a short, heartfelt, and creative birthday wish for someone named ${name || 'someone special'}. Keep it under 3 sentences.`,
      config: {
        temperature: 0.8,
        topP: 0.9,
      }
    });

    return response.text?.trim() || "Have a wonderful day filled with joy!";
  } catch (error) {
    console.error("Error generating wish:", error);
    return "Wishing you a fantastic year ahead full of amazing adventures and happy moments!";
  }
};

export const generateBirthdayStory = async (name: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Write a short "Legend of ${name || 'the Birthday Star'}" story. It should be an epic, humorous, or magical 2-paragraph tale about how they were destined to celebrate this specific birthday and bring joy to the world.`,
      config: {
        temperature: 0.9,
      }
    });

    return response.text?.trim() || "Long ago, a legend was born to bring light to the world...";
  } catch (error) {
    console.error("Error generating story:", error);
    return "Once upon a time, a remarkable individual began a journey that would inspire everyone they met...";
  }
};
