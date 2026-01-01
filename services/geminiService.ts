
import { GoogleGenAI, Type } from "@google/genai";
import { PartnershipSession, AIAnalysis } from "../types";
import { ANALYSIS_PROMPT_TEMPLATE, PARTNERSHIP_METHODOLOGY } from "../constants";

// Function to analyze partnership using Gemini API
export const analyzePartnership = async (session: PartnershipSession): Promise<AIAnalysis> => {
  // CRITICAL: Always create a new GoogleGenAI instance right before the call to ensure it uses the latest API key.
  // The API key must be obtained exclusively from process.env.API_KEY.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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

    // Directly access .text property from the response as it is a property, not a method.
    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error: any) {
    console.error("AI Analysis failed:", error);
    // Handle specific API errors as requested in guidelines (e.g., entity not found / API key issues)
    if (error?.message?.includes("entity was not found") || error?.message?.includes("API Key")) {
      throw new Error("AUTH_ERROR");
    }
    throw new Error("מערכת ה-AI לא הצליחה לגבש המלצות כרגע. וודא שהגדרת מפתח API תקין.");
  }
};
