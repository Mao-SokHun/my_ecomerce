import crypto from 'crypto';

/** Safely extract string from Express req.params / req.query values */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const str = (val: any): string => {
  if (Array.isArray(val)) return String(val[0] || '');
  if (val == null) return '';
  return String(val);
};

export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

export const paginate = (page: number = 1, limit: number = 12) => {
  const pageNum = Math.max(1, page);
  const limitNum = Math.min(100, Math.max(1, limit));
  const skip = (pageNum - 1) * limitNum;
  return { skip, take: limitNum, page: pageNum, limit: limitNum };
};

export const paginateResponse = (
  data: unknown[],
  total: number,
  page: number,
  limit: number
) => {
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};

export const sanitizeUser = (user: Record<string, unknown>) => {
  const { password, ...sanitized } = user;
  void password;
  return sanitized;
};
