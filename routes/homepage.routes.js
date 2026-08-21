import { Router } from 'express';
import verifyAdminToken from '../middleware/verifyAdminToken.js';
import upload from '../middleware/upload.js';
import validate from '../middleware/validate.js';
import {
  heroSlideIdParamValidator,
  createHeroSlideValidator,
  updateHeroSlideValidator,
  reorderHeroSlidesValidator,
  updateAuthHeroValidator,
} from '../validators/homepage.validator.js';
import {
  getPublicHeroSlides,
  getPublicAuthHero,
  listHeroSlides,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
  reorderHeroSlides,
  updateAuthHeroImage,
} from '../controllers/homepage.controller.js';

const router = Router();

/* ---------- Public: Home.jsx / Login.jsx / Signup.jsx (also read by the admin panel) ---------- */
router.get('/hero-slides', getPublicHeroSlides);
router.get('/auth-hero', getPublicAuthHero);

/* ---------- Admin: HomepageManager.jsx ---------- */
router.get('/admin/hero-slides', verifyAdminToken, listHeroSlides);

router.post(
  '/admin/hero-slides',
  verifyAdminToken,
  upload.single('image'),
  createHeroSlideValidator,
  validate,
  createHeroSlide,
);

router.patch(
  '/admin/hero-slides/reorder',
  verifyAdminToken,
  reorderHeroSlidesValidator,
  validate,
  reorderHeroSlides,
);

router.patch(
  '/admin/hero-slides/:slideId',
  verifyAdminToken,
  upload.single('image'),
  updateHeroSlideValidator,
  validate,
  updateHeroSlide,
);

router.delete(
  '/admin/hero-slides/:slideId',
  verifyAdminToken,
  heroSlideIdParamValidator,
  validate,
  deleteHeroSlide,
);

router.patch(
  '/admin/auth-hero/:page',
  verifyAdminToken,
  upload.single('image'),
  updateAuthHeroValidator,
  validate,
  updateAuthHeroImage,
);

export default router;