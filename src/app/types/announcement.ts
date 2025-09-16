export interface Announcement {
  id: string;
  title: string;
  body?: string;
  audience: "all" | "students" | "teachers" | "staff" | "families";
  createdAt: number; // Date.now()
  createdByUid: string;
  createdByName?: string;
}




