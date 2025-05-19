export interface Issue {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved';
  latitude: number;
  longitude: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  images?: string[];
  votes: number;
  comments: Comment[];
} 
