
import { GoogleGenAI, Type } from "@google/genai";
import { PartnershipSession, AIAnalysis } from "../types";
import { ANALYSIS_PROMPT_TEMPLATE } from "../constants";

export const analyzePartnership = async (session: PartnershipSession): Promise<AIAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const formattedData = {
    title: session.title,
    sides: session.sides,
    responses: session.responses.map(r => ({
      role: r.role,
      scores: r.scores,
      comments: r.comments
    }))
  };

  const prompt = `
    ${ANALYSIS_PROMPT_TEMPLATE}
    
    נתוני הממשק:
    ${JSON.stringify(formattedData, null, 2)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strengths: {
              type: Type.OBJECT,
              properties: {
                systemic: { type: Type.ARRAY, items: { type: Type.STRING } },
                relational: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['systemic', 'relational']
            },
            weaknesses: {
              type: Type.OBJECT,
              properties: {
                systemic: { type: Type.ARRAY, items: { type: Type.STRING } },
                relational: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['systemic', 'relational']
            },
            operationalRecommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            summary: { type: Type.STRING }
          },
          required: ['strengths', 'weaknesses', 'operationalRecommendations', 'summary']
        }
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Analysis failed:", error);
    throw new Error("מערכת ה-AI לא הצליחה לגבש המלצות כרגע. נסה שוב בעוד דקה.");
  }
};
