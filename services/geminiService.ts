
import { GoogleGenAI, Type } from "@google/genai";
import { PartnershipSession, AIAnalysis } from "../types";
import { PARTNERSHIP_METHODOLOGY } from "../constants";

export const analyzePartnership = async (session: PartnershipSession): Promise<AIAnalysis> => {
  // Respecting the pattern from the user image while keeping process.env for system requirements
  // @ts-ignore
  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY || process.env.API_KEY || "";
  const ai = new GoogleGenAI({ apiKey });
  
  const formattedData = {
    title: session.title,
    context: session.context,
    sides: session.sides,
    responses: session.responses.map(r => ({
      side: r.side,
      scores: r.scores,
      comments: r.comments
    }))
  };

  const prompt = `
    משימה: בצע "ניתוח השפעה אסטרטגי" (Key Driver Analysis).
    
    מתודולוגיה: ${PARTNERSHIP_METHODOLOGY}
    
    נתונים: ${JSON.stringify(formattedData)}

    שלבי הניתוח הנדרשים:
    1. המשתנה התלוי: השאלות q23 ו-q24 הן התוצאה (שביעות רצון ואפקטיביות). 
    2. מקדם השפעה: זהה איזה מהתנאים האחרים (אג'נדה, תפקידים, החלטות, תהליכים, כבוד, תקשורת) הכי משפיע על התוצאה הזו בממשק הספציפי הזה.
    3. פערים: נתח את הפער בין הצדדים.
    
    החזר JSON:
    {
      "strengths": { "systemic": [], "relational": [] },
      "weaknesses": { "systemic": [], "relational": [] },
      "recommendations": { "systemic": [], "relational": [] },
      "summary": "התחל ב'מקדם ההשפעה המרכזי' - מהו הדבר שהכי משפיע על שביעות הרצון כאן. המשך בניתוח פערים וסיים בהמלצות אופרטיביות."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("AI Analysis failed:", error);
    throw new Error("המערכת נכשלה בניתוח הנתונים.");
  }
};
