
import { GoogleGenAI } from "@google/genai";
import { PartnershipSession, AIAnalysis } from "../types";
import { PARTNERSHIP_METHODOLOGY } from "../constants";

const getApiKey = (): string => {
  try {
    // @ts-ignore
    return import.meta.env.VITE_GEMINI_API_KEY || "";
  } catch {
    return "";
  }
};

export const analyzePartnership = async (session: PartnershipSession, aggregatedData: any): Promise<AIAnalysis> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("מפתח API חסר.");
  
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    תפקיד: יועץ ניהולי בכיר. 
    משימה: אבחון ממשק עבודה ארגוני.
    
    נתונים:
    - מדד הצלחה (Outcome): ${aggregatedData.satisfactionScore}%
    - ביצועי דרייברים: ${JSON.stringify(aggregatedData.driverData)}
    - פער תפיסה: ${aggregatedData.biggestGap ? `${aggregatedData.biggestGap.label} (${aggregatedData.biggestGap.value})` : 'אין פערים חריגים'}

    הנחיות:
    1. דבר בגובה העיניים, שפה ניהולית פרקטית.
    2. הימנע ממושגים תיאורטיים (כמו "היישות השלישית").
    3. התמקד ב"למה זה קורה" ו"מה עושים מחר בבוקר".

    החזר JSON:
    {
      "summary": "אבחון המצב ב-3 משפטים חדים.",
      "recommendations": {
        "systemic": ["המלצה מבנית 1", "המלצה מבנית 2"],
        "relational": ["המלצה בינאישית 1", "המלצה בינאישית 2"]
      },
      "strengths": { "systemic": [], "relational": [] },
      "weaknesses": { "systemic": [], "relational": [] }
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { responseMimeType: "application/json", temperature: 0.4 }
    });
    return JSON.parse(response.text?.trim() || "{}");
  } catch (error) {
    throw new Error("ניתוח AI נכשל.");
  }
};

export const expandRecommendation = async (recommendation: string, context: string): Promise<string[]> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    הפוך את ההמלצה הניהולית הבאה לצעדים אופרטיביים ברורים בשטח:
    המלצה: "${recommendation}"
    הקשר הממשק: "${context}"
    
    דרישות:
    - 3-4 צעדים קונקרטיים.
    - שפה של "עשה".
    - בלי תיאוריה, רק ביצוע.
    
    החזר רשימת JSON של מחרוזות.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text?.trim() || "[]");
  } catch {
    return ["לא הצלחנו לפרט את ההמלצה כרגע."];
  }
};
