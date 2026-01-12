const express = require('express');
const router = express.Router();

// Safe import that checks if model already exists
let Admin;
try {
    Admin = require('../models/adminModel');
} catch (error) {
    console.log('Admin model import error:', error.message);
    // If there's an issue, try to get the existing model
    const mongoose = require('mongoose');
    Admin = mongoose.models.Admin;
}

const { signup, login, getProfile, updateProfile } = require('../controllers/adminController'); // Import the missing functions
const { protect, restrictTo } = require('../middleware/adminMiddleware');
const { check } = require('express-validator');

// Add multer to handle file uploads
const multer = require('multer');
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
        cb(new Error('Only image files are allowed'));
    }
});

// Validation middleware for signup
const signupValidation = [
    check('firstName').notEmpty().withMessage('First name is required'),
    check('lastName').notEmpty().withMessage('Last name is required'),
    check('email').isEmail().withMessage('Please enter a valid email address'),
    check('mobile').notEmpty().withMessage('Mobile number is required'),
    check('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
    .matches(/\d/).withMessage('Password must contain a number'),
    check('role')
    .isIn(['counselor', 'therapist', 'admin']).withMessage('Invalid role')
];

// Validation middleware for login
const loginValidation = [
    check('email').isEmail().withMessage('Please enter a valid email address'),
    check('password').notEmpty().withMessage('Password is required')
];

// Validation middleware for profile update
const updateProfileValidation = [
    check('bio').optional().isLength({ max: 1000 }).withMessage('Bio must be less than 1000 characters'),
    check('specialties').optional().isLength({ max: 500 }).withMessage('Specialties must be less than 500 characters'),
    check('experience').optional().isInt({ min: 0 }).withMessage('Experience must be a positive number'),
    check('qualifications').optional().isLength({ max: 1000 }).withMessage('Qualifications must be less than 1000 characters'),
    check('languages').optional().isLength({ max: 200 }).withMessage('Languages must be less than 200 characters')
];

// Routes
router.post('/signup', signupValidation, signup);
router.post('/login', loginValidation, login);

// Profile routes - FIXED to accept image upload
router.get('/profile', protect, getProfile); // Use actual controller function
router.put('/profile', protect, upload.single('profilePicture'), updateProfileValidation, updateProfile); // Accept 'profilePicture' file

// Dashboard statistics endpoint - TESTING WITHOUT AUTH
router.get('/stats', async(req, res) => {
    try {
        console.log('📊 Fetching dashboard statistics...');

        let totalUsers = 0;
        let totalAppointments = 0;

        // Import models safely
        let User, Admin, Appointment;

        try {
            User = require('../models/User');
            const userCount = await User.countDocuments();
            totalUsers += userCount;
            console.log(`👥 Users from User collection: ${userCount}`);
        } catch (error) {
            console.log('User model error:', error.message);
        }

        try {
            const AdminModel = require('../models/adminModel');
            const adminCount = await AdminModel.countDocuments();
            totalUsers += adminCount;
            console.log(`👥 Users from Admin collection: ${adminCount}`);
        } catch (error) {
            console.log('Admin model error:', error.message);
        }

        try {
            Appointment = require('../models/Appointment');
            totalAppointments = await Appointment.countDocuments();
            console.log(`📅 Total appointments: ${totalAppointments}`);
        } catch (error) {
            console.log('Appointment model not found - using 0');
            totalAppointments = 0;
        }

        // Count total resources (adjust based on your resources schema)
        const totalResources = 87; // You can replace this with actual count from resources collection

        // Calculate total revenue (adjust based on your payment/revenue tracking)
        const totalRevenue = 5240; // You can replace this with actual revenue calculation

        const stats = {
            totalUsers,
            totalAppointments,
            totalResources,
            totalRevenue
        };

        console.log('✅ Statistics generated:', stats);

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('❌ Stats fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics',
            error: error.message
        });
    }
});


// User management routes - Updated to fetch from both User and Admin collections
router.get('/users', protect, restrictTo('admin'), async(req, res) => {
    try {
        console.log('📋 Fetching all users from both User and Admin collections...');

        // Import both User and Admin models
        let User, Admin;
        try {
            User = require('../models/User');
        } catch (error1) {
            try {
                User = require('../models/userModel');
            } catch (error2) {
                console.error('❌ Could not import User model:', error1.message, error2.message);
            }
        }

        try {
            Admin = require('../models/adminModel');
        } catch (error) {
            try {
                Admin = require('../models/Admin');
            } catch (error2) {
                console.error('❌ Could not import Admin model:', error.message, error2.message);
            }
        }

        const allUsers = [];

        // Fetch users from User collection
        if (User) {
            const users = await User.find({}).select('-password -resetPasswordToken -resetPasswordExpire -verificationToken -verificationExpire').lean();
            console.log(`📋 Found ${users.length} users from User collection`);

            const formattedUsers = users.map(user => ({
                _id: user._id,
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                mobile: user.mobile || '',
                role: user.role || 'user',
                status: user.status || 'active',
                createdAt: user.createdAt,
                isVerified: user.isVerified || false,
                source: 'user' // To identify the source collection
            }));

            allUsers.push(...formattedUsers);
        }

        // Fetch users from Admin collection (counselors, therapists, admins)
        if (Admin) {
            const adminUsers = await Admin.find({}).select('-password').lean();
            console.log(`📋 Found ${adminUsers.length} users from Admin collection`);

            const formattedAdminUsers = adminUsers.map(admin => ({
                _id: admin._id,
                firstName: admin.firstName || '',
                lastName: admin.lastName || '',
                email: admin.email || '',
                mobile: admin.mobile || '',
                role: admin.role || 'admin',
                status: 'active', // Admin users are typically always active
                createdAt: admin.createdAt,
                isVerified: true, // Admin users are typically verified
                source: 'admin', // To identify the source collection
                // Additional admin-specific fields
                bio: admin.bio || '',
                specialties: admin.specialties || '',
                experience: admin.experience || 0,
                qualifications: admin.qualifications || '',
                languages: admin.languages || '',
                profilePicture: admin.profilePicture || ''
            }));

            allUsers.push(...formattedAdminUsers);
        }

        // Sort all users by creation date (newest first)
        allUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        console.log(`✅ Total users found: ${allUsers.length} (${allUsers.filter(u => u.source === 'user').length} from User collection, ${allUsers.filter(u => u.source === 'admin').length} from Admin collection)`);

        res.json({
            success: true,
            users: allUsers,
            count: allUsers.length,
            breakdown: {
                regularUsers: allUsers.filter(u => u.role === 'user').length,
                admins: allUsers.filter(u => u.role === 'admin').length,
                counselors: allUsers.filter(u => u.role === 'counselor').length,
                therapists: allUsers.filter(u => u.role === 'therapist').length
            }
        });

    } catch (error) {
        console.error('❌ Error fetching all users:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching users',
            error: error.message
        });
    }
});

// Specialists route - Add this new route
router.get('/specialists', async(req, res) => {
    try {
        // Fetch only counselors and therapists from admin collection
        const specialists = await Admin.find({
            role: { $in: ['counselor', 'therapist'] }
        }).select('firstName lastName role specialties bio experience languages -_id');

        // Transform data for frontend
        const formattedSpecialists = specialists.map((specialist, index) => ({
            id: index + 1,
            name: `${specialist.firstName} ${specialist.lastName}`,
            role: specialist.role === 'counselor' ? 'Licensed Counselor' : 'Clinical Therapist',
            specialty: specialist.specialties || 'General Mental Health',
            avatar: `${specialist.firstName.charAt(0)}${specialist.lastName.charAt(0)}`,
            experience: specialist.experience || 0,
            bio: specialist.bio || 'Dedicated mental health professional committed to helping clients achieve wellness.',
            languages: specialist.languages || 'English',
            rating: (4.5 + Math.random() * 0.5).toFixed(1), // Random rating between 4.5-5.0
            reviews: Math.floor(Math.random() * 200) + 50, // Random reviews 50-250
            availability: generateWeeklyAvailability(index + 1)
        }));

        res.status(200).json({
            success: true,
            specialists: formattedSpecialists
        });
    } catch (error) {
        console.error('Error fetching specialists:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching specialists',
            error: error.message
        });
    }
});

// Helper function for availability (add this at the end of the file)
function generateWeeklyAvailability(specialistId) {
    const availability = {};
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 1); // Start from tomorrow

    days.forEach((day, index) => {
        const date = new Date(baseDate);
        date.setDate(baseDate.getDate() + index);
        const dateKey = date.toISOString().split('T')[0];

        const slots = [
            '09:00 AM', '10:30 AM', '12:00 PM', '02:00 PM',
            '03:30 PM', '05:00 PM', '06:30 PM'
        ];

        availability[dateKey] = slots.map(slot => ({
            time: slot,
            date: dateKey,
            day: day,
            available: Math.random() > 0.25 // 75% availability
        }));
    });

    return availability;
}

module.exports = router;