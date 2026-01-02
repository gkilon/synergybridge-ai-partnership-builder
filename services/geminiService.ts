
import { GoogleGenAI } from "@google/genai";
import { PartnershipSession, AIAnalysis } from "../types";

export const analyzePartnership = async (session: PartnershipSession, aggregatedData: any): Promise<AIAnalysis> => {
  // STRICT REQUIREMENT: Access process.env.API_KEY directly as per senior engineer guidelines
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.error("Gemini API Key is missing in process.env.API_KEY");
    throw new Error("מפתח API חסר במערכת. אנא וודא שהגדרות process.env.API_KEY תקינות.");
  }
  
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    תפקיד: יועץ ניהולי בכיר המומחה בממשקי עבודה.
    משימה: אבחון חד ופרקטי של ממשק עבודה ארגוני על בסיס נתונים.
    נתונים גולמיים:
    - מדד בריאות הממשק: ${aggregatedData.satisfactionScore}%
    - ביצועי דרייברים (תהליכים ויחסים): ${JSON.stringify(aggregatedData.driverData)}
    - פער תפיסה מקסימלי: ${aggregatedData.biggestGap ? `${aggregatedData.biggestGap.label} (פער של ${aggregatedData.biggestGap.value} נקודות)` : 'תיאום גבוה בין הצדדים'}
    החזר JSON בלבד במבנה הבא:
    {
      "summary": "אבחון המצב ב-3 משפטים.",
      "recommendations": { "systemic": [], "relational": [] },
      "strengths": { "systemic": [], "relational": [] },
      "weaknesses": { "systemic": [], "relational": [] }
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json", 
        temperature: 0.4 
      }
    });
    return JSON.parse(response.text?.trim() || "{}");
  } catch (error) {
    console.error("Gemini analyzePartnership Error:", error);
    throw error;
  }
};

export const expandRecommendation = async (recommendation: string, context: string): Promise<string[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return ["לא ניתן לפרט המלצה ללא מפתח API (process.env.API_KEY)."];
  
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `הפוך את ההמלצה הבאה לצעדים אופרטיביים: "${recommendation}". הקשר: "${context}". החזר רשימת JSON של מחרוזות.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json" 
      }
    });
    return JSON.parse(response.text?.trim() || "[]");
  } catch (error) {
    console.error("Gemini expandRecommendation Error:", error);
    return ["בצע פגישת סנכרון", "הגדר תחומי אחריות"];
  }
};
