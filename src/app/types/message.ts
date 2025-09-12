export interface DirectMessage {
  id: string;
  fromUid: string;
  toUid: string; // destinatario directo
  body: string;
  createdAt: number; // Date.now()
  readBy?: string[]; // uids que han leído
}

export interface CourseMessage {
  id: string;
  fromUid: string;
  courseId: string; // futuro: id de curso/grupo
  body: string;
  createdAt: number;
}



