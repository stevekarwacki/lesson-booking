const { defineAbilitiesFor, can, canBookingAction } = require('../utils/abilities');

/**
 * Middleware to check if user has permission to perform an action on a subject
 * @param {string} action - The action to check (create, read, update, delete, manage)
 * @param {string} subject - The subject/resource type
 * @param {Object} options - Additional options
 * @returns {Function} Express middleware function
 */
const authorize = (action, subject, options = {}) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const ability = defineAbilitiesFor(req.user);
    
    // Basic permission check
    if (!ability.can(action, subject)) {
      return res.status(403).json({ 
        error: 'Permission denied',
        required: `${action} ${subject}`
      });
    }

    // Attach ability to request for use in route handlers
    req.ability = ability;
    next();
  };
};

/**
 * Check if user has any of the specified permissions
 * Useful when multiple roles can access an endpoint
 * @param {Array<{action: string, subject: string}>} permissions - Array of permission objects
 * @returns {Function} Express middleware function
 */
const authorizeAny = (permissions) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const ability = defineAbilitiesFor(req.user);
    
    // Check if user has any of the required permissions
    const hasPermission = permissions.some(({ action, subject }) => 
      ability.can(action, subject)
    );
    
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'Permission denied',
        required: permissions.map(p => `${p.action} ${p.subject}`).join(' OR ')
      });
    }

    // Attach ability to request for use in route handlers
    req.ability = ability;
    next();
  };
};

/**
 * Middleware to check permissions on a specific resource
 * @param {string} action - The action to check
 * @param {string} subject - The subject/resource type
 * @param {Function} getResource - Function to get the resource from request
 * @returns {Function} Express middleware function
 */
const authorizeResource = (action, subject, getResource) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const resource = await getResource(req);
      
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      if (!can(req.user, action, subject, resource)) {
        return res.status(403).json({ 
          error: 'Permission denied for this resource',
          required: `${action} ${subject}`
        });
      }

      // Attach both ability and resource to request
      req.ability = defineAbilitiesFor(req.user);
      req.resource = resource;
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Error checking permissions' });
    }
  };
};

/**
 * Specialized middleware for booking permissions with time-based restrictions
 * @param {string} action - The action to check
 * @param {Function} getBooking - Function to get the booking from request
 * @returns {Function} Express middleware function
 */
const authorizeBooking = (action, getBooking) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const booking = await getBooking(req);
      
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      // Use specialized booking permission check with time restrictions
      if (!canBookingAction(req.user, booking, action)) {
        // Determine if it's a permission issue or time restriction
        const hasBasePermission = can(req.user, action, 'Booking', booking);
        
        if (!hasBasePermission) {
          return res.status(403).json({ 
            error: 'Permission denied for this booking',
            required: `${action} Booking`
          });
        } else {
          // Must be a time restriction
          return res.status(403).json({ 
            error: 'Cannot modify booking within 24 hours of scheduled time',
            reason: 'time_restriction'
          });
        }
      }

      req.ability = defineAbilitiesFor(req.user);
      req.booking = booking;
      next();
    } catch (error) {
      console.error('Booking permission check error:', error);
      res.status(500).json({ error: 'Error checking booking permissions' });
    }
  };
};

/**
 * Middleware to check if user can access another user's data
 * @param {Function} getUserId - Function to get the target user ID from request
 * @returns {Function} Express middleware function
 */
const authorizeUserAccess = (getUserId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const targetUserId = await getUserId(req);
      
      // Users can always access their own data
      if (req.user.id === targetUserId) {
        req.ability = defineAbilitiesFor(req.user);
        return next();
      }

      // Check if user has general permission to read other users
      if (!can(req.user, 'read', 'User', { id: targetUserId })) {
        return res.status(403).json({ 
          error: 'Permission denied to access this user data'
        });
      }

      req.ability = defineAbilitiesFor(req.user);
      req.targetUserId = targetUserId;
      next();
    } catch (error) {
      console.error('User access permission check error:', error);
      res.status(500).json({ error: 'Error checking user access permissions' });
    }
  };
};

/**
 * Helper middleware to ensure user owns an instructor profile
 * @returns {Function} Express middleware function
 */
const requireOwnInstructor = () => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Instructor access required' });
    }

    req.ability = defineAbilitiesFor(req.user);
    next();
  };
};

module.exports = {
  authorize,
  authorizeAny,
  authorizeResource,
  authorizeBooking,
  authorizeUserAccess,
  requireOwnInstructor
};
