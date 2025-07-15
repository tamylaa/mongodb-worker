const express = require('express');
const router = express.Router();
const { getUserById, getUserByEmail, createUser, updateUser } = require('../controllers/userController'); // Adjust path

router.get('/:id', getUserById);
router.get('/email/:email', getUserByEmail);
router.post('/', createUser);
router.patch('/:id', updateUser);

module.exports = router;