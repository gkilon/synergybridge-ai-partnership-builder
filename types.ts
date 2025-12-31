
export enum Category {
  SYSTEMIC = 'systemic',
  RELATIONAL = 'relational'
}

export interface Question {
  id: string;
  category: Category;
  text: string;
}

export interface ParticipantResponse {
  id: string;
  participantName: string;
  role: string;
  scores: Record<string, number>;
  comments: string;
  submittedAt: string;
}

export interface PartnershipSession {
  id: string;
  title: string;
  description: string;
  sides: string[];
  questions: Question[]; // Custom questions per session
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
  operationalRecommendations: string[];
  summary: string;
}
