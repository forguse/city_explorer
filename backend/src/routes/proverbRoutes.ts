
import express from 'express';
import * as proverbController from '../controllers/proverbController';
import { auth } from '../middleware/auth';

const router = express.Router();

router.use(auth); // All routes require auth

router.get('/my', proverbController.getMyProverbs);
router.get('/lbs', proverbController.getLBSProverb);
router.post('/', proverbController.createProverb);
router.delete('/:id', proverbController.deleteProverb);
router.post('/:id/report', proverbController.reportProverb);

export default router;
