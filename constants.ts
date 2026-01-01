
import { Category, Question } from './types';

export const DEFAULT_QUESTIONS: Question[] = [
  // מנגנון (Systemic)
  { id: 'goal_1', category: Category.SYSTEMIC, text: 'המידה בה המטרה של הממשק ברורה ומוסכמת על שני הצדדים', shortLabel: 'מטרה' },
  { id: 'goal_2', category: Category.SYSTEMIC, text: 'המידה בה סדרי העדיפויות מסונכרנים בין היחידות', shortLabel: 'מטרה' },
  
  { id: 'roles_1', category: Category.SYSTEMIC, text: 'בהירות חלוקת האחריות וגבולות הגזרה בין הצוותים', shortLabel: 'תפקידים' },
  { id: 'roles_2', category: Category.SYSTEMIC, text: 'המידה בה אין כפילויות או "שטחים מתים" בביצוע המשימות', shortLabel: 'תפקידים' },
  
  { id: 'decisions_1', category: Category.SYSTEMIC, text: 'המידה בה תהליכי קבלת ההחלטות בממשק מהירים וענייניים', shortLabel: 'החלטות' },
  { id: 'decisions_2', category: Category.SYSTEMIC, text: 'בהירות לגבי מי מחליט מה ובאיזה פורום', shortLabel: 'החלטות' },
  
  { id: 'routines_1', category: Category.SYSTEMIC, text: 'קיומן של פגישות ושגרות עבודה קבועות שמקדמות את המטרות', shortLabel: 'שגרות' },
  { id: 'routines_2', category: Category.SYSTEMIC, text: 'האפקטיביות של שגרות העבודה הקיימות (ניהול זמן ותוצרים)', shortLabel: 'שגרות' },

  // יחסים (Relational)
  { id: 'transparency_1', category: Category.RELATIONAL, text: 'המידה בה מידע רלוונטי זורם בחופשיות בין הצדדים', shortLabel: 'שקיפות' },
  { id: 'transparency_2', category: Category.RELATIONAL, text: 'רמת הכנות והפתיחות בדיווח על תקלות או אתגרים', shortLabel: 'שקיפות' },
  
  { id: 'respect_1', category: Category.RELATIONAL, text: 'המידה בה יש הערכה מקצועית הדדית בין בעלי התפקידים', shortLabel: 'כבוד' },
  { id: 'respect_2', category: Category.RELATIONAL, text: 'שמירה על שיח מכבד גם במצבי לחץ או אי-הסכמה', shortLabel: 'כבוד' },
  
  { id: 'commitment_1', category: Category.RELATIONAL, text: 'רמת הגיוס והנרתמות של הצד השני להצלחת המשימות שלי', shortLabel: 'מחויבות' },
  { id: 'commitment_2', category: Category.RELATIONAL, text: 'המידה בה הצדדים מרגישים "באותה סירה" מול המשימה', shortLabel: 'מחויבות' },
  
  { id: 'comm_1', category: Category.RELATIONAL, text: 'זמינות ונגישות של השותפים בצד השני כשיש צורך', shortLabel: 'תקשורת' },
  { id: 'comm_2', category: Category.RELATIONAL, text: 'היכולת לפתור קונפליקטים בצורה ישירה וללא משקעים', shortLabel: 'תקשורת' },
];

export const ANALYSIS_PROMPT_TEMPLATE = `
כמערכת AI בכירה לייעוץ אסטרטגי וניהול שותפויות, נתח את הנתונים המצורפים של הממשק הארגוני.
הממשק נמדד על פי 8 פרמטרים (מטרה, תפקידים, החלטות, שגרות, שקיפות, כבוד, מחויבות, תקשורת).

עליך לספק דוח מעמיק הכולל:
1. ניתוח תמונת מצב אסטרטגית: הסבר לא רק "מה" הציון, אלא "למה" זה קורה בהתחשב בהקשר הארגוני.
2. ניתוח צולב (Impact Analysis): איך הפערים במנגנון משפיעים על היחסים, או איך חוסר באמון פוגע בתהליכי קבלת ההחלטות.
3. זיהוי פערים קריטיים בין הצדדים: איפה צד אחד חווה מציאות שונה לחלוטין מהצד השני.
4. חוזקות וחולשות אבסולוטיות: מהם עמודי התווך של הממשק ומהם המעכבים המרכזיים.
5. תוכנית עבודה אופרטיבית: 5 המלצות קונקרטיות, ישימות ומנומקות.

החזר את התשובה בפורמט JSON בלבד, בעברית מקצועית וגבוהה:
{
  "strengths": { "systemic": ["חוזקה מפורטת 1", "חוזקה מפורטת 2"], "relational": ["חוזקה מפורטת 1"] },
  "weaknesses": { "systemic": ["חולשה מפורטת 1"], "relational": ["חולשה מפורטת 1"] },
  "operationalRecommendations": ["המלצה מנומקת 1", "המלצה מנומקת 2", "המלצה מנומקת 3", "המלצה מנומקת 4", "המלצה מנומקת 5"],
  "summary": "דוח מפורט ומעמיק (לפחות 3 פסקאות) הכולל ניתוח השפעה..."
}
`;
