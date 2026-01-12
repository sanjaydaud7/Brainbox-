const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');

// Specialists route - Get all specialists for appointment booking
router.get('/specialists', async (req, res) => {
    try {
        console.log('Fetching specialists from database...');
        
        // Fetch only counselors and therapists from admin collection
        const specialists = await Admin.find({
            role: { $in: ['counselor', 'therapist'] }
        }).select('firstName lastName role specialties bio experience languages qualifications -_id');

        console.log(`Found ${specialists.length} specialists`);

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
            qualifications: specialist.qualifications || 'Licensed Mental Health Professional',
            rating: (4.5 + Math.random() * 0.5).toFixed(1), // Random rating between 4.5-5.0
            reviews: Math.floor(Math.random() * 200) + 50, // Random reviews 50-250
            availability: generateWeeklyAvailability(index + 1)
        }));

        res.status(200).json({
            success: true,
            specialists: formattedSpecialists,
            count: formattedSpecialists.length
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

// Helper function for availability
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
