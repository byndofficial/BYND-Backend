import { Router } from 'express';
import verifyAdminToken from '../middleware/verifyAdminToken.js';
import validate from '../middleware/validate.js';
import {
  createSizeChartValidator,
  updateSizeChartValidator,
  sizeChartIdParamValidator,
} from '../validators/sizeChart.validator.js';
import {
  listSizeCharts,
  getSizeChartById,
  createSizeChart,
  updateSizeChart,
  deleteSizeChart,
} from '../controllers/sizeChart.controller.js';

const router = Router();

// Public reads
router.get('/', listSizeCharts);
router.get('/:chartId', sizeChartIdParamValidator, validate, getSizeChartById);

// Admin-gated writes
router.use(verifyAdminToken);
router.post('/', createSizeChartValidator, validate, createSizeChart);
router.patch('/:chartId', updateSizeChartValidator, validate, updateSizeChart);
router.delete('/:chartId', sizeChartIdParamValidator, validate, deleteSizeChart);

export default router;