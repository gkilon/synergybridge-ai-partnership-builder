
import { Category, Question } from './types';

export const PARTNERSHIP_METHODOLOGY = `
גישת הממשק האפקטיבי:
1. סנכרון מטרות (Alignment)
2. בהירות תפקידים וסמכויות
3. שגרות עבודה ותקשורת זורמת
4. אמון מקצועי ובינאישי
`;

export const DEFAULT_QUESTIONS: Question[] = [
  // --- צד המערכתי (דרייברים) ---
  { id: 'q1', category: Category.SYSTEMIC, text: 'המטרות המשותפות ברורות', shortLabel: 'אג\'נדה' },
  { id: 'q2', category: Category.SYSTEMIC, text: 'יש הסכמה על סדרי העדיפויות', shortLabel: 'אג\'נדה' },
  { id: 'q5', category: Category.SYSTEMIC, text: 'התפקידים ותחומי האחריות ברורים', shortLabel: 'תפקידים' },
  { id: 'q6', category: Category.SYSTEMIC, text: 'לכל אחד ברור מה מצופה ממנו', shortLabel: 'תפקידים' },
  { id: 'q8', category: Category.SYSTEMIC, text: 'ברור מי ואיך צריך לקבל החלטות', shortLabel: 'החלטות' },
  { id: 'q10', category: Category.SYSTEMIC, text: 'חברי השותפות מחויבים להחלטות', shortLabel: 'החלטות' },
  { id: 'q12', category: Category.SYSTEMIC, text: 'תהליכי העבודה המשותפים איכותיים', shortLabel: 'תהליכים' },
  { id: 'q13', category: Category.SYSTEMIC, text: 'קיימות שגרות עבודה מספקות', shortLabel: 'תהליכים' },

  // --- צד היחסים (דרייברים) ---
  { id: 'q15', category: Category.RELATIONAL, text: 'חברי השותפות מכבדים את הזמן אחד של השני', shortLabel: 'כבוד' },
  { id: 'q16', category: Category.RELATIONAL, text: 'קיימת הערכה לשונות ולערך המוסף', shortLabel: 'כבוד' },
  { id: 'q19', category: Category.RELATIONAL, text: 'המידע שאני צריך זמין עבורי', shortLabel: 'תקשורת' },
  { id: 'q20', category: Category.RELATIONAL, text: 'שמים דברים על השולחן ללא רתיעה', shortLabel: 'תקשורת' },

  // --- משתנים תלויים (Outcome) ---
  { id: 'q23', category: Category.SYSTEMIC, text: 'מהי מידת האפקטיביות של השותפות לדעתך?', shortLabel: 'OUTCOME_SATISFACTION' },
  { id: 'q24', category: Category.RELATIONAL, text: 'עד כמה אתה שבע רצון מהממשק?', shortLabel: 'OUTCOME_SATISFACTION' },
];
