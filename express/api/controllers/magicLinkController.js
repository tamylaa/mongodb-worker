import { 
  createMagicLink as createMagicLinkService,
  verifyMagicLink as verifyMagicLinkService
} from '../../../src/shared/services/userService.js';

// @desc    Create magic link
// @route   POST /api/users/:userId/magic-links
// @access Public
export const createMagicLink = async (req, res) => {
  try {
    const { userId } = req.params;
    const { email, name } = req.body;
    
    const result = await createMagicLinkService(userId, { email, name });
    
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.message === 'User not found and no email provided for new user') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    console.error('Create magic link error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Verify magic link
// @route   GET /api/magic-links
// @access  Public
export const verifyMagicLink = async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }
    
    const userData = await verifyMagicLinkService(token);
    
    res.status(200).json({
      success: true,
      data: userData
    });
  } catch (error) {
    if (error.message === 'Invalid or expired magic link') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    console.error('Verify magic link error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};
