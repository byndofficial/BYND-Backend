import { Router } from 'express';
import verifyFirebaseToken from '../middleware/verifyFirebaseToken.js';
import validate from '../middleware/validate.js';
import { notificationIdParamValidator } from '../validators/notification.validator.js';
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notification.controller.js';

const router = Router();

router.use(verifyFirebaseToken);

router.get('/', getMyNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:notificationId/read', notificationIdParamValidator, validate, markAsRead);
router.delete('/:notificationId', notificationIdParamValidator, validate, deleteNotification);

export default router;