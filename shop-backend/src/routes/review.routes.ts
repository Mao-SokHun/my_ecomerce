import { Router } from 'express';
import { getProductReviews, getMyReviews, createReview, updateReview, deleteReview } from '../controllers/review.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/me', authenticate, getMyReviews);
router.get('/product/:productId', getProductReviews);
router.post('/product/:productId', authenticate, createReview);
router.put('/:reviewId', authenticate, updateReview);
router.delete('/:reviewId', authenticate, deleteReview);

export default router;
