import { Router } from 'express';
import authRoutes from './auth.routes.js';
import adminAuthRoutes from './adminAuth.routes.js';
import adminManagementRoutes from './adminManagement.routes.js';
import adminUserRoutes from './adminUser.routes.js';
import userRoutes from './user.routes.js';
import categoryRoutes from './category.routes.js';
import productRoutes from './product.routes.js';
import adminProductRoutes from './adminProduct.routes.js';
import cartRoutes from './cart.routes.js';
import wishlistRoutes from './wishlist.routes.js';
import orderRoutes from './order.routes.js';
import adminOrderRoutes from './adminOrder.routes.js';
import paymentRoutes from './payment.routes.js';
import discountRoutes from './discount.routes.js';
import adminDiscountRoutes from './adminDiscount.routes.js';
import homepageRoutes from './homepage.routes.js';
import analyticsRoutes from './analytics.routes.js';
import notificationRoutes from './notification.routes.js';
import adminNotificationRoutes from './adminNotification.routes.js';
import emailRoutes from './email.routes.js';
import sizeChartRoutes from './sizeChart.routes.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ success: true, message: 'BYND Official API root — see /health for status.' });
});

router.use('/auth', authRoutes);
router.use('/admin/auth', adminAuthRoutes);
router.use('/admin/management', adminManagementRoutes);
router.use('/admin/users', adminUserRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/admin/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/admin/products', adminProductRoutes);
router.use('/cart', cartRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/orders', orderRoutes);
router.use('/admin/orders', adminOrderRoutes);
router.use('/payments', paymentRoutes);
router.use('/discounts', discountRoutes);
router.use('/admin/discounts', adminDiscountRoutes);
router.use('/homepage', homepageRoutes);
router.use('/admin/analytics', analyticsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin/notifications', adminNotificationRoutes);
router.use('/admin/email-templates', emailRoutes);
router.use('/size-charts', sizeChartRoutes);
router.use('/admin/size-charts', sizeChartRoutes);

// ...etc — added one resource at a time per the project roadmap.

export default router;