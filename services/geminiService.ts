import { GoogleGenAI, Type } from "@google/genai";
import { PartnershipSession, AIAnalysis } from "../types";

/**
 * Robustly cleans a string that might contain markdown JSON code blocks.
 */
const cleanJSONResponse = (text: string): string => {
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
  console.log('=== GEMINI API DEBUG ===');
  console.log('1. import.meta.env:', import.meta.env);
  console.log('2. VITE_GEMINI_API_KEY exists:', !!import.meta.env.VITE_GEMINI_API_KEY);
  console.log('3. API Key length:', import.meta.env.VITE_GEMINI_API_KEY?.length);
  console.log('4. First 10 chars:', import.meta.env.VITE_GEMINI_API_KEY?.substring(0, 10));
  
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ API Key is MISSING!');
    return DEFAULT_ANALYSIS;
  }
  
  console.log('✅ Initializing GoogleGenAI with key...');
  const ai = new GoogleGenAI({ apiKey });
  
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
    console.log('📡 Calling Gemini API...');
    const response = await ai.models.generateContent({
      model: 'gemini-pro',
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

    console.log('✅ API Response received');
    const text = response.text;
    if (!text) return DEFAULT_ANALYSIS;
    
    try {
      return JSON.parse(cleanJSONResponse(text));
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, text);
      return DEFAULT_ANALYSIS;
    }
  } catch (error) {
    console.error("❌ Gemini API Error:", error);
    throw error;
  }
};

export const expandRecommendation = async (recommendation: string, context: string): Promise<string[]> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ API Key missing in expandRecommendation');
    return ["בדוק את שלבי הביצוע"];
  }
  
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Convert this recommendation into 4 concrete steps in Hebrew: "${recommendation}". Context: "${context}". Return a JSON array of strings.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-pro',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    });
    const text = response.text;
    if (!text) return ["בדוק את שלבי הביצוע"];
    return JSON.parse(cleanJSONResponse(text));
  } catch (error) {
    console.error('❌ expandRecommendation error:', error);
    return ["קבע פגישה", "הגדר יעדים", "תעד הסכמות"];
  }
};