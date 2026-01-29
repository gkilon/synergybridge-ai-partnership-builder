import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { PartnershipSession, AIAnalysis } from "../types";

/**
 * מנקה את התגובה במקרה שגוגל מחזירה Markdown JSON
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
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ API Key is MISSING!');
    return DEFAULT_ANALYSIS;
  }

  // אתחול ה-SDK הרשמי
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // הגדרת המודל עם Schema קשיח (כדי שיחזור JSON תקין תמיד)
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    }
  });

  const prompt = `
    Role: Senior Management Consultant specialized in organizational interfaces.
    Mission: Provide a sharp, data-driven diagnosis of a work partnership interface.
    Context: ${session.context || session.title || 'General organizational interface'}
    Raw Data:
    - Interface Health Score (Outcome): ${aggregatedData.satisfactionScore}%
    - Drivers performance: ${JSON.stringify(aggregatedData.driverData)}
    - Biggest Perception Gap: ${aggregatedData.biggestGap ? \`\${aggregatedData.biggestGap.label} (Gap of \${aggregatedData.biggestGap.value} points)\` : 'High alignment'}
    
    Output Language: Hebrew (עברית).
    Return ONLY a JSON object with this structure:
    {
      "summary": "string",
      "recommendations": { "systemic": ["string"], "relational": ["string"] },
      "strengths": { "systemic": ["string"], "relational": ["string"] },
      "weaknesses": { "systemic": ["string"], "relational": ["string"] }
    }
  `;

  try {
    console.log('📡 Calling Gemini API (v1.5 Flash)...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('✅ API Response received');
    
    if (!text) return DEFAULT_ANALYSIS;
    
    return JSON.parse(cleanJSONResponse(text));
  } catch (error) {
    console.error("❌ Gemini API Error:", error);
    // במקרה של שגיאה במודל, נחזיר את ברירת המחדל כדי שהאפליקציה לא תקרוס
    return DEFAULT_ANALYSIS;
  }
};

export const expandRecommendation = async (recommendation: string, context: string): Promise<string[]> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ API Key missing');
    return ["בדוק את שלבי הביצוע"];
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  });

  const prompt = `Convert this recommendation into 4 concrete steps in Hebrew: "\${recommendation}". Context: "\${context}". Return a JSON array of strings.`;
  
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(cleanJSONResponse(text));
  } catch (error) {
    console.error('❌ expandRecommendation error:', error);
    return ["קבע פגישה", "הגדר יעדים", "תעד הסכמות"];
  }
};