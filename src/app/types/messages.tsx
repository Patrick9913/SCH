export interface DirectMessage {
    id: string;
    body: string;
    createdAt: number; // Date.now()
    fromUid: string;
    toUid: string;
    participants: string[];
    readBy: string[]; // UIDs of users who have read the message
}

export interface ChatMessage {
    id: string;
    body: string;
    createdAt: number;
    fromUid: string;
    chatId: string;
    readBy: string[];
    messageType?: 'text' | 'image' | 'file';
}

export interface Chat {
    id: string;
    participants: string[];
    lastMessage?: ChatMessage;
    lastMessageAt: number;
    createdAt: number;
    isActive: boolean;
    unreadCount: Record<string, number>; // UID -> count
}

export interface ChatParticipant {
    uid: string;
    name: string;
    isOnline?: boolean;
    lastSeen?: number;
}