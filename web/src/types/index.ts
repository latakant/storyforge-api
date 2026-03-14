export type Role = 'READER' | 'WRITER' | 'EDITOR' | 'ADMIN';
export type ArticleStatus = 'DRAFT' | 'SUBMITTED' | 'PUBLISHED' | 'ARCHIVED';
export type CommentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  bio: string | null;
  avatarUrl: string | null;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  status: ArticleStatus;
  publishedAt: string | null;
  coverImageUrl: string | null;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleDetail extends Article {
  latestContent: string | null;
  author: { id: string; name: string };
  tags: Tag[];
  clapCount: number;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface Comment {
  id: string;
  articleId: string;
  authorId: string;
  body: string;
  status: CommentStatus;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Revision {
  id: string;
  articleId: string;
  content: string;
  editorNote: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface AuthTokens {
  accessToken: string;
  user: User;
}
