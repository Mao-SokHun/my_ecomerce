import rateLimit from 'express-rate-limit';

const isProduction = process.env.NODE_ENV === 'production';

/** Limits anonymous contact / newsletter endpoints (abuse-resistant). */
export const publicContactFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 25 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many submissions. Please try again later.' },
});
