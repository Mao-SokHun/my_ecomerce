import { Router } from 'express';
import { getAddresses, addAddress, updateAddress, deleteAddress, getWishlist, toggleWishlist } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/addresses', getAddresses);
router.post('/addresses', addAddress);
router.put('/addresses/:id', updateAddress);
router.delete('/addresses/:id', deleteAddress);

router.get('/wishlist', getWishlist);
router.post('/wishlist', toggleWishlist);

export default router;
