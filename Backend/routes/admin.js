const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');

// Get dashboard statistics
router.get('/stats', authenticateToken, async(req, res) => {
    try {
        console.log('📊 Fetching dashboard statistics...');

        let totalUsers = 0;
        let totalAppointments = 0;

        // Import models safely
        let User, Admin, Appointment;

        try {
            User = require('../models/User');
        } catch (error) {
            console.log('User model not found, trying alternative path');
        }

        try {
            Admin = require('../models/adminModel');
        } catch (error) {
            try {
                Admin = require('../models/Admin');
            } catch (error2) {
                console.log('Admin model not found');
            }
        }

        try {
            Appointment = require('../models/Appointment');
        } catch (error) {
            try {
                Appointment = require('../models/appointmentModel');
            } catch (error2) {
                console.log('Appointment model not found');
            }
        }

        // Count users from User collection
        if (User) {
            const userCount = await User.countDocuments();
            totalUsers += userCount;
            console.log(`👥 Users from User collection: ${userCount}`);
        }

        // Count users from Admin collection (counselors, therapists, admins)
        if (Admin) {
            const adminCount = await Admin.countDocuments();
            totalUsers += adminCount;
            console.log(`👥 Users from Admin collection: ${adminCount}`);
        }

        // Count appointments
        if (Appointment) {
            totalAppointments = await Appointment.countDocuments();
            console.log(`📅 Total appointments: ${totalAppointments}`);
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

module.exports = router;