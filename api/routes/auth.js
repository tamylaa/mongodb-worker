const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const { v4: uuidv4 } = require('uuid');

/**
 * @route   POST /auth/magic-link/request
 * @desc    Request a magic link for authentication
 * @access  Public
 */
router.post('/magic-link/request', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'A valid email address is required' 
      });
    }

    // Find or create user
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email, name });
    } else if (name && !user.name) {
      user.name = name;
    }

    // Generate and save magic link
    const { token, expiresAt } = user.addMagicLink();
    await user.save();

    // In production, you would send an email here
    const magicLink = `${process.env.FRONTEND_URL}/auth/verify?token=${token}`;
    
    console.log(`Magic link generated for ${email}: ${magicLink}`);
    
    res.json({
      success: true,
      message: 'Magic link generated successfully',
      // Only return magic link in development
      ...(process.env.NODE_ENV !== 'production' && { magicLink })
    });

  } catch (error) {
    console.error('Magic link request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process magic link request',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
});

/**
 * @route   GET /auth/magic-link/verify
 * @desc    Verify a magic link and authenticate user
 * @access  Public
 */
router.get('/magic-link/verify', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }

    // Verify the magic link
    const user = await User.verifyMagicLink(token);
    
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Generate a session token (in a real app, use JWT)
    const sessionToken = uuidv4();
    
    res.json({
      success: true,
      token: sessionToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        isEmailVerified: user.isEmailVerified
      }
    });

  } catch (error) {
    console.error('Magic link verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify magic link',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
});

module.exports = router;