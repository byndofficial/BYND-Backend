import { Router } from 'express';
import authRoutes from './auth.routes.js';
import adminAuthRoutes from './adminAuth.routes.js';
import adminManagementRoutes from './adminManagement.routes.js';
import categoryRoutes from './category.routes.js';
import productRoutes from './product.routes.js';
import adminProductRoutes from './adminProduct.routes.js';
import cartRoutes from './cart.routes.js';
import wishlistRoutes from './wishlist.routes.js';
import orderRoutes from './order.routes.js';
import paymentRoutes from './payment.routes.js';
import discountRoutes from './discount.routes.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ success: true, message: 'BYND Official API root — see /health for status.' });
});

router.use('/auth', authRoutes);
router.use('/admin/auth', adminAuthRoutes);
router.use('/admin/management', adminManagementRoutes);
router.use('/categories', categoryRoutes);
router.use('/admin/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/admin/products', adminProductRoutes);
router.use('/cart', cartRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/discounts', discountRoutes);

// ...etc — added one resource at a time per the project roadmap.

export default router;