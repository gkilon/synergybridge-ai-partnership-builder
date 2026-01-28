import { GoogleGenAI, Type } from "@google/genai";
import { PartnershipSession, AIAnalysis } from "../types";

/**
 * Senior Engineer Fix:
 * 1. Strictly follow the @google/genai initialization guideline: 
 *    `const ai = new GoogleGenAI({apiKey: process.env.API_KEY});`.
 * 2. Removed `import.meta.env` which was causing TypeScript errors.
 * 3. Initializing the client inside the functions as recommended for up-to-date key access.
 */

export const analyzePartnership = async (session: PartnershipSession, aggregatedData: any): Promise<AIAnalysis> => {
  // Initialize AI client using process.env.API_KEY directly.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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

    // Access the .text property directly from the response.
    return JSON.parse(response.text?.trim() || "{}");
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const expandRecommendation = async (recommendation: string, context: string): Promise<string[]> => {
  // Initialize AI client using process.env.API_KEY directly.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
    // Access the .text property directly from the response.
    return JSON.parse(response.text?.trim() || "[]");
  } catch (error) {
    console.error("Gemini Expansion Error:", error);
    return ["קבע פגישת סנכרון", "הגדר יעדים משותפים", "תעד את ההסכמות"];
  }
};
