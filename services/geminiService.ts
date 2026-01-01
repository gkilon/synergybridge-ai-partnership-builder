
import { GoogleGenAI, Type } from "@google/genai";
import { PartnershipSession, AIAnalysis } from "../types";
import { ANALYSIS_PROMPT_TEMPLATE, PARTNERSHIP_METHODOLOGY } from "../constants";

export const analyzePartnership = async (session: PartnershipSession): Promise<AIAnalysis> => {
  const apiKey = (process.env.API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || "").trim();
  
  if (!apiKey) {
    throw new Error("מפתח API לא הוגדר. אנא וודא שהגדרת VITE_GEMINI_API_KEY או API_KEY.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const formattedData = {
    title: session.title,
    context: session.context || "לא הוגדר הקשר ספציפי",
    sidesDefined: session.sides,
    responses: session.responses.map(r => ({
      sideRepresented: r.side,
      role: r.role,
      scores: r.scores,
      comments: r.comments
    }))
  };

  const prompt = `
    מתודולוגיית עבודה (KNOWLEDGE BASE):
    ${PARTNERSHIP_METHODOLOGY}

    ---
    
    ${ANALYSIS_PROMPT_TEMPLATE}
    
    נתוני הממשק והקשר ארגוני לניתוח:
    ${JSON.stringify(formattedData, null, 2)}

    שים לב: 
    - הנתונים כוללים את ה"צד" (sideRepresented) של כל משיב. השווה בין תפיסות הצדדים בראי המתודולוגיה.
    - ההקשר (context) מסביר את יחסי התלות - השתמש במושגי "ויתור ורווח" כדי להסביר את התלות הזו.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
  } catch (error: any) {
    console.error("AI Analysis failed:", error);
    if (error?.message?.includes("entity was not found") || error?.message?.includes("API Key")) {
      throw new Error("AUTH_ERROR");
    }
    throw new Error("מערכת ה-AI לא הצליחה לגבש המלצות כרגע. וודא שהגדרת מפתח API תקין.");
  }
};
