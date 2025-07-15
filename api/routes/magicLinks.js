const express = require('express');
const router = express.Router();
const { createMagicLink, verifyMagicLink } = require('../controllers/magicLinkController'); // Adjust path

router.post('/users/:userId/magic-links', createMagicLink);
router.get('/magic-links/verify', verifyMagicLink); // Changed to match test script

module.exports = router;
