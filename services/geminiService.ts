
import { GoogleGenAI, Type } from "@google/genai";
import { PartnershipSession, AIAnalysis } from "../types";

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing in process.env.API_KEY");
  return new GoogleGenAI({ apiKey });
};

export const analyzePartnership = async (session: PartnershipSession, aggregatedData: any): Promise<AIAnalysis> => {
  const ai = getAI();
  
  const prompt = `
    Role: Senior Management Consultant specialized in organizational interfaces.
    Mission: Provide a sharp, data-driven diagnosis of a work partnership interface.
    Context: ${session.context || 'General organizational interface'}
    Raw Data:
    - Interface Health Score (Outcome): ${aggregatedData.satisfactionScore}%
    - Drivers performance (Systemic vs Relational): ${JSON.stringify(aggregatedData.driverData)}
    - Biggest Perception Gap: ${aggregatedData.biggestGap ? `${aggregatedData.biggestGap.label} (Gap of ${aggregatedData.biggestGap.value} points)` : 'High alignment between sides'}
    
    Output Language: Hebrew (עברית).
    Constraints: Return ONLY a JSON object matching the requested schema.
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
            summary: { type: Type.STRING, description: 'Diagnosis of the situation in 3 punchy sentences.' },
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

    return JSON.parse(response.text?.trim() || "{}");
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const expandRecommendation = async (recommendation: string, context: string): Promise<string[]> => {
  const ai = getAI();
  const prompt = `Convert this high-level recommendation into 4-5 concrete operational steps in Hebrew: "${recommendation}". Context: "${context}". Return a JSON array of strings.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text?.trim() || "[]");
  } catch (error) {
    console.error("Gemini Expansion Error:", error);
    return ["קבע פגישת סנכרון", "הגדר יעדים משותפים", "תעד את ההסכמות"];
  }
};
