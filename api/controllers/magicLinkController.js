import { User } from '../../models/User.js';
import { v4 as uuidv4 } from 'uuid';

// @desc    Create magic link
// @route   POST /api/users/:userId/magic-links
// @access  Public
export const createMagicLink = async (req, res) => {
  try {
    const { userId } = req.params;
    const { email, name } = req.body;
    
    let user = await User.findById(userId);
    
    // If user doesn't exist and email is provided, create new user
    if (!user && email) {
      user = new User({ 
        email,
        name: name || ''
      });
      await user.save();
    } else if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found and no email provided for new user'
      });
    }
    
    // Generate magic link token
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    // Add to user's magic links array
    user.magicLinks.push({
      token,
      expiresAt,
      used: false
    });
    
    await user.save();
    
    res.status(201).json({
      success: true,
      data: {
        userId: user._id,
        token,
        expiresAt
      }
    });
    
  } catch (error) {
    console.error('Create magic link error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Verify magic link
// @route   GET /api/magic-links/:token
// @access  Public

export const verifyMagicLink = async (req, res) => {
  try {
    const { token } = req.query; // Changed from req.params to req.query
    const user = await User.findOne({
      'magicLinks.token': token,
      'magicLinks.used': false,
      'magicLinks.expiresAt': { $gt: new Date() }
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired magic link'
      });
    }
    const magicLink = user.magicLinks.find(ml => ml.token === token);
    magicLink.used = true;
    magicLink.usedAt = new Date();
    user.lastLogin = new Date();
    await user.save();
    res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Verify magic link error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};
