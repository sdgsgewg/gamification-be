export interface BaseTaskDetail {
  title: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  subject?: {
    id: string;
    name: string;
  } | null;
  material?: {
    id: string;
    name: string;
  } | null;
  grade?: string | null;
  questionCount: number;
  difficulty: string;
  createdBy?: string;
}
