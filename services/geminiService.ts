
import { GoogleGenAI, Type } from "@google/genai";
import { PartnershipSession, AIAnalysis } from "../types";

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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Role: Senior Organizational Data Scientist & Strategy Consultant.
    Mission: Diagnose an organizational partnership using Multiple Linear Regression (MLR) results.
    
    KEY DATA INPUTS:
    - Overall Satisfaction Score: ${aggregatedData.satisfactionScore}%
    - Standardized Regression Weights (Beta coefficients): ${JSON.stringify(aggregatedData.impactData)}
    - Statistical Validity: ${aggregatedData.isRegressionValid ? 'High (Sufficient N)' : 'Low (Interpret with caution)'}
    
    DIAGNOSIS LOGIC:
    1. Drivers with high Beta (Impact > 0.3) are the "True Levers". Focus recommendations here.
    2. If a driver has a low raw score but high Beta, it's a "Critical Pain Point".
    3. If a driver has high score and high Beta, it's a "Strategic Pillar".
    4. Distinguish between systemic factors (Agenda, Roles, Decisions, Processes) and relational factors (Respect, Communication).
    
    Output Language: Hebrew (עברית).
    Format: Return ONLY a JSON object matching the provided schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 2500,
        thinkingConfig: { thinkingBudget: 0 },
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
      return JSON.parse(cleanJSONResponse(text));
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Convert this high-level recommendation into 4 concrete, actionable executive steps in Hebrew: "${recommendation}". Context: "${context}". Return a JSON array of strings.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 1000,
        thinkingConfig: { thinkingBudget: 0 },
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    });
    const text = response.text;
    if (!text) return ["בצע הערכה"];
    return JSON.parse(cleanJSONResponse(text));
  } catch (error) {
    return ["קבע פגישה", "הגדר יעדים", "תעד הסכמות"];
  }
};
