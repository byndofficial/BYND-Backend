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
  saveHomepageLayoutValidator,
  updateProductPicksValidator,
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
  getPublicHomepageLayout,
  getAdminHomepageLayout,
  saveHomepageLayout,
  uploadLayoutImage,
  getPublicProductPicks,
  getAdminProductPicks,
  updateProductPicks,
} from '../controllers/homepage.controller.js';

const router = Router();

/* ---------- Public: Home.jsx / Login.jsx / Signup.jsx ---------- */
router.get('/hero-slides', getPublicHeroSlides);
router.get('/auth-hero', getPublicAuthHero);
router.get('/layout', getPublicHomepageLayout);
router.get('/product-picks', getPublicProductPicks);

/* ---------- Admin: Hero Slider ---------- */
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

/* ---------- Admin: Login/Signup hero image ---------- */
router.patch(
  '/admin/auth-hero/:page',
  verifyAdminToken,
  upload.single('image'),
  updateAuthHeroValidator,
  validate,
  updateAuthHeroImage,
);

/* ---------- Admin: Homepage Builder ---------- */
router.get('/admin/layout', verifyAdminToken, getAdminHomepageLayout);
router.put('/admin/layout', verifyAdminToken, saveHomepageLayoutValidator, validate, saveHomepageLayout);
router.post('/admin/layout/upload-image', verifyAdminToken, upload.single('image'), uploadLayoutImage);

/* ---------- Admin: Featured products (Best Sellers / New Arrivals picks) ---------- */
router.get('/admin/product-picks', verifyAdminToken, getAdminProductPicks);
router.patch(
  '/admin/product-picks/:section',
  verifyAdminToken,
  updateProductPicksValidator,
  validate,
  updateProductPicks,
);

export default router;