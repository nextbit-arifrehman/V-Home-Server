// middlewares/verifyRole.js

/**
 * Middleware to check if the user has one of the allowed roles.
 * Usage: verifyRole('admin'), verifyRole('agent'), etc.
 */

const verifyRole = (...allowedRoles) => {
    return (req, res, next) => {
      const user = req.user; // Comes from verifyJWT middleware
  
      if (!user || !user.role) {
        return res.status(403).json({ message: 'Forbidden: Role not found' });
      }
  
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: `Forbidden: Requires role(s) ${allowedRoles.join(', ')}` });
      }
  
      next();
    };
  };
  
  module.exports = verifyRole;
  