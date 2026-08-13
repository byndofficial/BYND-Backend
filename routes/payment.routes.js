import { Router } from 'express';
import { verifyPayment, handleWebhook } from '../controllers/payment.controller.js';
import verifyFirebaseToken from '../middleware/verifyFirebaseToken.js';

const router = Router();

// Authenticated — called by the frontend after Razorpay Checkout succeeds.
router.post('/orders/:orderId/verify', verifyFirebaseToken, verifyPayment);

// NOTE: the webhook itself is NOT mounted here. It needs express.raw()
// ahead of express.json(), so it's wired directly in app.js as:
//   app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), handleWebhook);
// before the app.use(express.json()) line. Exporting the handler for that.
export { handleWebhook };
export default router;