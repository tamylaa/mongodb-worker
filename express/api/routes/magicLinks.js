import express from 'express';
import { User } from '../../models/User.js';
const router = express.Router();
import { createMagicLink, verifyMagicLink } from '../controllers/magicLinkController.js'; // Adjust path

router.post('/users/:userId/magic-links', createMagicLink);
router.get('/magic-links/verify', verifyMagicLink); // Changed to match test script

export default router;
