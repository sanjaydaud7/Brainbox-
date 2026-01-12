const jwt = require('jsonwebtoken');
const Admin = require('../models/adminModel');

exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.admin = await Admin.findById(decoded.id).select('-password');
            
            if (!req.admin) {
                return res.status(401).json({ message: 'Not authorized, admin not found' });
            }

            // Allow all roles defined in adminModel.js to access
            const allowedRoles = ['counselor', 'therapist', 'admin'];
            if (!allowedRoles.includes(req.admin.role)) {
                return res.status(403).json({ message: 'You do not have permission to access this page' });
            }
            
            next();
        } catch (error) {
            console.error('Token verification error:', error.message);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        return res.status(401).json({ message: 'Not authorized, no token provided' });
    }
};

// Role-based authorization (kept for other routes)
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.admin.role)) {
            return res.status(403).json({ message: 'You do not have permission to perform this action' });
        }
        next();
    };
};