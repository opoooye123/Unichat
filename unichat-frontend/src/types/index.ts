export interface User {
  id: string;
  name: string;
  email: string;
  schoolId: string;
  status: string;
  banCount: number;
}

export interface MatchFoundData {
  sessionId: string;
  partnerId: string;
}

export interface SignalData {
  type: 'offer' | 'answer' | 'ice-candidate';
  [key: string]: any;
}

export interface ChatMessage {
  from: 'me' | 'partner';
  text: string;
}