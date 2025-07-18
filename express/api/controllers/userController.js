import { 
  findUserById as findUserByIdService,
  findUserByEmail as findUserByEmailService,
  createUser as createUserService,
  updateUser as updateUserService
} from '../../../src/shared/services/userService.js';

// @desc    Find user by ID
// @route   GET /api/users/:id
// @access  Public
export async function getUserById(req, res) {
  try {
    const user = await findUserByIdService(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
}

// @desc    Find user by email
// @route   GET /api/users/email/:email
// @access  Public
export async function getUserByEmail(req, res) {
  try {
    const user = await findUserByEmailService(req.params.email);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user by email error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
}

// @desc    Create new user
// @route   POST /api/users
// @access  Public
export async function createUser(req, res) {
  try {
    const { email, name } = req.body;
    const user = await createUserService({ email, name });
    
    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    if (error.message === 'User already exists') {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
}

// @desc    Update user
// @route   PATCH /api/users/:id
// @access  Public
export async function updateUser(req, res) {
  try {
    const user = await updateUserService(req.params.id, req.body);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
}