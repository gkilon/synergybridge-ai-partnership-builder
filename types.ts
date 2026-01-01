
export enum Category {
  SYSTEMIC = 'systemic',
  RELATIONAL = 'relational'
}

export interface Question {
  id: string;
  category: Category;
  text: string;
  shortLabel?: string; // מילה מרכזית לתצוגה בגרפים
}

export interface ParticipantResponse {
  id: string;
  participantName: string;
  side: string; // The specific side/department the person represents
  role: string;
  scores: Record<string, number>;
  comments: string;
  submittedAt: string;
}

export interface PartnershipSession {
  id: string;
  title: string;
  description: string;
  context?: string; // Dependency relations / Process context
  sides: string[];
  questions: Question[]; 
  responses: ParticipantResponse[];
  analysis?: AIAnalysis;
  createdAt: string;
}

export interface AIAnalysis {
  strengths: {
    systemic: string[];
    relational: string[];
  };
  weaknesses: {
    systemic: string[];
    relational: string[];
  };
  recommendations: {
    systemic: string[];
    relational: string[];
  };
  summary: string;
}
