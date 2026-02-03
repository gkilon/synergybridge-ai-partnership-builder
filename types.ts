
export enum Category {
  SYSTEMIC = 'systemic',
  RELATIONAL = 'relational'
}

export type Language = 'he' | 'en';

export interface Question {
  id: string;
  category: Category;
  text: string;
  shortLabel?: string;
}

export interface ParticipantResponse {
  id: string;
  participantName: string;
  side: string;
  role: string;
  scores: Record<string, number>;
  comments: string;
  submittedAt: string;
}

export interface PartnershipSession {
  id: string;
  title: string;
  description: string;
  context?: string;
  sides: string[];
  questions: Question[]; 
  responses: ParticipantResponse[];
  analysis?: AIAnalysis;
  createdAt: string;
  language?: Language;
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
  gapInsights?: string[]; // New: Deeper analysis of misalignments between sides
}
