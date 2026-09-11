import express from 'express';
import { getConversation, sendMessage, getConversations, getGroupMessages, sendGroupMessage } from '../controllers/messageController';
import { auth } from '../middleware/auth';

const router = express.Router();

router.use(auth);

router.get('/conversations', getConversations);
router.get('/group/:groupId', getGroupMessages);
router.post('/group/:groupId', sendGroupMessage);
router.get('/:targetUserId', getConversation);
router.post('/', sendMessage);

export default router;
