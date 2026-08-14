import { Router } from 'express';
import verifyAdminToken from '../middleware/verifyAdminToken.js';
import validate from '../middleware/validate.js';
import {
  emailTypeParamValidator,
  updateSystemEmailValidator,
  createCampaignEmailValidator,
  updateCampaignEmailValidator,
  templateIdParamValidator,
  sendCampaignEmailValidator,
} from '../validators/email.validator.js';
import {
  listSystemTemplates,
  updateSystemTemplate,
  resetSystemTemplate,
  listCampaignTemplates,
  createCampaignTemplate,
  updateCampaignTemplate,
  setActiveCampaignTemplate,
  deleteCampaignTemplate,
  sendCampaignEmail,
  listSentHistory,
} from '../controllers/email.controller.js';

const router = Router();

router.use(verifyAdminToken);

router.get('/system', listSystemTemplates);
router.patch('/system/:type', updateSystemEmailValidator, validate, updateSystemTemplate);
router.patch('/system/:type/reset', emailTypeParamValidator, validate, resetSystemTemplate);

router.get('/campaign', listCampaignTemplates);
router.post('/campaign', createCampaignEmailValidator, validate, createCampaignTemplate);
router.patch('/campaign/:templateId', updateCampaignEmailValidator, validate, updateCampaignTemplate);
router.patch('/campaign/:templateId/activate', templateIdParamValidator, validate, setActiveCampaignTemplate);
router.delete('/campaign/:templateId', templateIdParamValidator, validate, deleteCampaignTemplate);

router.post('/send', sendCampaignEmailValidator, validate, sendCampaignEmail);
router.get('/history', listSentHistory);

export default router;