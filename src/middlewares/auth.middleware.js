import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { errorResponse } from '../utils/response.js';

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return errorResponse(res, 401, 'Not authorized to access this route');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user || !req.user.isActive) {
      return errorResponse(res, 401, 'User no longer exists or is inactive');
    }
    
    next();
  } catch (error) {
    return errorResponse(res, 401, 'Not authorized, token failed');
  }
};

export {  protect  };
