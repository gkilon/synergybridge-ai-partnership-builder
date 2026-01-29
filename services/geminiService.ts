
import { GoogleGenAI, Type } from "@google/genai";
import { PartnershipSession, AIAnalysis } from "../types";

/**
 * Robustly cleans a string that might contain markdown JSON code blocks.
 */
const cleanJSONResponse = (text: string): string => {
  if (!text) return "";
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    const match = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (match && match[1]) {
      cleaned = match[1].trim();
    }
  }
  return cleaned;
};

const DEFAULT_ANALYSIS: AIAnalysis = {
  summary: "לא ניתן היה להפיק ניתוח מלא ברגע זה. מומלץ לבדוק את נתוני המענים ולנסות שוב.",
  recommendations: { systemic: ["בדוק הגדרות ממשק"], relational: ["קיים פגישת סנכרון"] },
  strengths: { systemic: [], relational: [] },
  weaknesses: { systemic: [], relational: [] }
};

export const analyzePartnership = async (session: PartnershipSession, aggregatedData: any): Promise<AIAnalysis> => {
  // Use process.env.API_KEY exclusively as per guidelines
  const apiKey = process.env.API_KEY || "";
  if (!apiKey) {
    throw new Error("Missing API Key. Ensure VITE_GEMINI_API_KEY is set in Netlify.");
  }

  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  
  const prompt = `
    Role: Senior Management Consultant specialized in organizational interfaces.
    Mission: Provide a sharp, data-driven diagnosis of a work partnership interface.
    Context: ${session.context || session.title || 'General organizational interface'}
    Raw Data:
    - Interface Health Score (Outcome): ${aggregatedData.satisfactionScore}%
    - Drivers performance: ${JSON.stringify(aggregatedData.driverData)}
    - Biggest Perception Gap: ${aggregatedData.biggestGap ? `${aggregatedData.biggestGap.label} (Gap of ${aggregatedData.biggestGap.value} points)` : 'High alignment'}
    
    Output Language: Hebrew (עברית).
    Constraints: Return ONLY a JSON object. No conversational filler.
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
            summary: { type: Type.STRING },
            recommendations: {
              type: Type.OBJECT,
              properties: {
                systemic: { type: Type.ARRAY, items: { type: Type.STRING } },
                relational: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['systemic', 'relational']
            },
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
            }
          },
          required: ['summary', 'recommendations', 'strengths', 'weaknesses']
        }
      }
    });

    const text = response.text;
    if (!text) return DEFAULT_ANALYSIS;
    
    try {
      const parsed = JSON.parse(cleanJSONResponse(text));
      return parsed;
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, text);
      return DEFAULT_ANALYSIS;
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const expandRecommendation = async (recommendation: string, context: string): Promise<string[]> => {
  const apiKey = process.env.API_KEY || "";
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Convert this recommendation into 4 concrete steps in Hebrew: "${recommendation}". Context: "${context}". Return a JSON array of strings.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } },
        thinkingConfig: { thinkingBudget: 0 } // Disable thinking for faster simple tasks
      }
    });
    const text = response.text;
    if (!text) return ["בדוק את שלבי הביצוע"];
    return JSON.parse(cleanJSONResponse(text));
  } catch (error) {
    return ["קבע פגישה", "הגדר יעדים", "תעד הסכמות"];
  }
};
