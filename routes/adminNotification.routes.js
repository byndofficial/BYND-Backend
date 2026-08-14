import { Router } from 'express';
import verifyAdminToken from '../middleware/verifyAdminToken.js';
import validate from '../middleware/validate.js';
import {
  updateSystemTemplateValidator,
  createCustomTemplateValidator,
  updateCustomTemplateValidator,
  templateIdParamValidator,
  sendBroadcastValidator,
} from '../validators/notification.validator.js';
import {
  listSystemTemplates,
  updateSystemTemplate,
  listCustomTemplates,
  createCustomTemplate,
  updateCustomTemplate,
  deleteCustomTemplate,
  sendTemplate,
  listSentHistory,
} from '../controllers/adminNotification.controller.js';

import { resetSystemTemplate } from '../controllers/adminNotification.controller.js';

const router = Router();

router.use(verifyAdminToken);

router.get('/system', listSystemTemplates);
router.patch('/system/:templateId', updateSystemTemplateValidator, validate, updateSystemTemplate);
router.patch('/system/:templateId/reset', templateIdParamValidator, validate, resetSystemTemplate);

router.get('/custom', listCustomTemplates);
router.post('/custom', createCustomTemplateValidator, validate, createCustomTemplate);
router.patch('/custom/:templateId', updateCustomTemplateValidator, validate, updateCustomTemplate);
router.delete('/custom/:templateId', templateIdParamValidator, validate, deleteCustomTemplate);

router.post('/send', sendBroadcastValidator, validate, sendTemplate);
router.get('/history', listSentHistory);

export default router;