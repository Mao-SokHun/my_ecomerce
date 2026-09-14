import { Router } from 'express';
import {
  getProducts,
  getProduct,
  getProductSuggestions,
  createProduct,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  getRelatedProducts,
} from '../controllers/product.controller';
import { authenticate, requireAdmin, requireStoreAdminOrSuper } from '../middleware/auth';

const router = Router();

router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/suggestions', getProductSuggestions);
router.get('/:slug', getProduct);
router.get('/:slug/related', getRelatedProducts);

router.post('/', authenticate, requireStoreAdminOrSuper, createProduct);
router.put('/:id', authenticate, requireAdmin, updateProduct);
router.delete('/:id', authenticate, requireStoreAdminOrSuper, deleteProduct);

export default router;
