export const MAIL_QUEUE = 'mail';

export const MailJobType = {
  ARTICLE_PUBLISHED: 'article.published',
  COMMENT_APPROVED: 'comment.approved',
} as const;

export type MailJobType = (typeof MailJobType)[keyof typeof MailJobType];

export interface ArticlePublishedPayload {
  type: typeof MailJobType.ARTICLE_PUBLISHED;
  authorEmail: string;
  authorName: string;
  articleTitle: string;
  articleSlug: string;
}

export interface CommentApprovedPayload {
  type: typeof MailJobType.COMMENT_APPROVED;
  authorEmail: string;
  authorName: string;
  articleTitle: string;
  articleSlug: string;
  commentBody: string;
}

export type MailJobPayload = ArticlePublishedPayload | CommentApprovedPayload;
