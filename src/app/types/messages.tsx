export interface DirectMessage {
    id: string;
    body: string;
    createdAt: number; // Date.now()
    fromUid: string;
    toUid: string;
    participants: string[];
    readBy: string[]; // UIDs of users who have read the message
}