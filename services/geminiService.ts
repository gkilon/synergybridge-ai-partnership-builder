
import { GoogleGenAI } from "@google/genai";
import { PartnershipSession, AIAnalysis } from "../types";
import { PARTNERSHIP_METHODOLOGY } from "../constants";

// Senior Engineer Fix: Consolidating GenAI interaction to adhere to strict coding guidelines
export const analyzePartnership = async (session: PartnershipSession, aggregatedData: any): Promise<AIAnalysis> => {
  // Always obtain API key exclusively from process.env.API_KEY as per GenAI guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    תפקיד: יועץ בכיר לבניית שותפויות וממשקים ארגוניים.
    משימה: ניתוח פרגמטי עמוק של ממשק עבודה בין יחידות.
    
    מתודולוגיה: ${PARTNERSHIP_METHODOLOGY}
    
    נתוני הניתוח (Drivers & Outcomes):
    - כותרת הממשק: ${session.title}
    - הקשר: ${session.context || 'לא צוין'}
    - מדד שביעות רצון ואפקטיביות (Target): ${aggregatedData.satisfactionScore}%
    - ממוצעי דרייברים (1-7): ${JSON.stringify(aggregatedData.driverData)}
    - פער תפיסה מקסימלי: ${aggregatedData.biggestGap ? `${aggregatedData.biggestGap.label} (${aggregatedData.biggestGap.value} נקודות)` : 'אין פערים מהותיים'}

    הנחיות קשיחות:
    1. אל תצטט שאלות או קודים של שאלות (כמו q1, q23).
    2. אל תחזור על הנתונים המספריים - נתח את המשמעות שלהם.
    3. התמקד ב"יישות השלישית" - מה הבעיה המבנית בממשק הזה?
    4. ספק המלצות פרגמטיות שאפשר להתחיל ליישם מחר בבוקר.

    החזר JSON במבנה:
    {
      "strengths": { "systemic": [], "relational": [] },
      "weaknesses": { "systemic": [], "relational": [] },
      "recommendations": { "systemic": [], "relational": [] },
      "summary": "ניתוח אסטרטגי קצר ונוקב על 'צוואר הבקבוק' של הממשק והשפעתו על השורה התחתונה."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        temperature: 0.6
      }
    });

    // Safely extract text from GenerateContentResponse as a property (not a method)
    const jsonStr = response.text?.trim() || "{}";
    return JSON.parse(jsonStr);
  } catch (error: any) {
    console.error("AI Analysis failed:", error);
    throw new Error("המערכת נכשלה ביצירת התובנות. בדוק חיבור ומפתח API.");
  }
};
