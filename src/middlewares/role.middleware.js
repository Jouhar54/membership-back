import { errorResponse } from '../utils/response.js';

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 403, `User role ${req.user.role} is not authorized to access this route`);
    }
    next();
  };
};

export {  authorize  };
