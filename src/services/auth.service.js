import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const generateTokens = (id) => {
  const accessToken = jwt.sign({ id }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '30m',
  });
  const refreshToken = jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
  return { accessToken, refreshToken };
};

const registerUser = async (userData) => {
  const { fullName, email, phone, password, role, batch, district } = userData;

  const userExists = await User.findOne({ $or: [{ email }, { phone }] });
  if (userExists) {
    throw new Error('User with email or phone already exists');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    fullName,
    email,
    phone,
    password: hashedPassword,
    role,
    batch,
    district,
  });

  return user;
};

const loginUser = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user || !user.isActive) {
    throw new Error('Invalid credentials or inactive user');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  const tokens = generateTokens(user._id);
  return { user, tokens };
};

const refreshAuthToken = async (refreshToken) => {
  if (!refreshToken) throw new Error('No refresh token provided');

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user || !user.isActive) {
      throw new Error('Invalid user');
    }

    return generateTokens(user._id);
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

export { 
  registerUser,
  loginUser,
  refreshAuthToken,
 };
