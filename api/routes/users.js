import express from 'express';
const router = express.Router();
import { getUserById, getUserByEmail, createUser, updateUser } from '../controllers/userController.js'; // Adjust path

router.get('/:id', getUserById);
router.get('/email/:email', getUserByEmail);
router.post('/', createUser);
router.patch('/:id', updateUser);

export default router;