import { Router } from 'express';
import {
  register,
  login,
  googleLogin,
  facebookLogin,
  getMe,
  updateProfile,
  changePassword,
  requestPasswordResetByEmail,
  resetPasswordByEmailCode,
  resetPasswordByInfo,
  refreshTokenHandler,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshTokenHandler);
router.post('/google', googleLogin);
router.post('/facebook', facebookLogin);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.put('/password', authenticate, changePassword);
router.post('/forgot-password/email/request', requestPasswordResetByEmail);
router.post('/forgot-password/email/verify', resetPasswordByEmailCode);
router.post('/forgot-password/info/verify', resetPasswordByInfo);

export default router;
