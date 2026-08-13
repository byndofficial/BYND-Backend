import { Router } from 'express';
import verifyAdminToken from '../middleware/verifyAdminToken.js';
import validate from '../middleware/validate.js';
import {
  createCategoryValidator,
  updateCategoryValidator,
  createSubCategoryValidator,
  updateSubCategoryValidator,
  categoryIdParamValidator,
  subCategoryIdParamValidator,
} from '../validators/category.validator.js';
import {
  getCategoryTree,
  getFlatSubCategories,
  createMainCategory,
  updateMainCategory,
  deleteMainCategory,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
} from '../controllers/category.controller.js';

const router = Router();

// ---------- Public reads (storefront + admin both use these) ----------
router.get('/', getCategoryTree);
router.get('/flat', getFlatSubCategories);

// ---------- Admin-gated writes ----------
router.use(verifyAdminToken);

router.post('/', createCategoryValidator, validate, createMainCategory);
router.patch('/:categoryId', updateCategoryValidator, validate, updateMainCategory);
router.delete('/:categoryId', categoryIdParamValidator, validate, deleteMainCategory);

router.post('/:categoryId/subcategories', createSubCategoryValidator, validate, createSubCategory);
router.patch(
  '/:categoryId/subcategories/:subCategoryId',
  updateSubCategoryValidator,
  validate,
  updateSubCategory,
);
router.delete(
  '/:categoryId/subcategories/:subCategoryId',
  subCategoryIdParamValidator,
  validate,
  deleteSubCategory,
);

export default router;