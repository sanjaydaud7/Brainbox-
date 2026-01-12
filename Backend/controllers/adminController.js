const Admin = require('../models/adminModel');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Cloudinary setup
const cloudinary = require('cloudinary').v2;
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Add a guard to ensure credentials are present
const hasCloudinaryConfig = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

// Admin Signup
exports.signup = async(req, res) => {
    try {
        console.log('Signup request:', req.body);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Validation errors:', errors.array());
            return res.status(400).json({ errors: errors.array() });
        }

        const { firstName, lastName, email, mobile, role, password, bio, specialties, experience, qualifications, languages } = req.body;

        // Check if admin already exists
        const adminExists = await Admin.findOne({ email: email.toLowerCase().trim() });
        if (adminExists) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        // Create new admin
        const admin = await Admin.create({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.toLowerCase().trim(),
            mobile: mobile.trim(),
            role: role || 'admin',
            password,
            bio: bio || '',
            specialties: specialties || '',
            experience: parseInt(experience) || 0,
            qualifications: qualifications || '',
            languages: languages || ''
        });

        console.log('Admin created:', admin._id);

        // Generate token
        const token = generateToken(admin._id);

        res.status(201).json({
            success: true,
            token,
            admin: {
                id: admin._id,
                firstName: admin.firstName,
                lastName: admin.lastName,
                email: admin.email,
                mobile: admin.mobile,
                role: admin.role,
                bio: admin.bio,
                specialties: admin.specialties,
                experience: admin.experience,
                qualifications: admin.qualifications,
                languages: admin.languages,
                profilePicture: admin.profilePicture || ''
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server error during signup', error: error.message });
    }
};

// Admin Login
exports.login = async(req, res) => {
    try {
        console.log('Login attempt for:', req.body.email);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Find admin
        const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
        if (!admin) {
            console.log('Admin not found:', email);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        console.log('Admin found, checking password...');

        // Check password
        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            console.log('Password mismatch for:', email);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Generate token
        const token = generateToken(admin._id);

        console.log('Login successful for:', email);

        res.status(200).json({
            success: true,
            token,
            admin: {
                id: admin._id,
                firstName: admin.firstName,
                lastName: admin.lastName,
                email: admin.email,
                mobile: admin.mobile,
                role: admin.role,
                bio: admin.bio,
                specialties: admin.specialties,
                experience: admin.experience,
                qualifications: admin.qualifications,
                languages: admin.languages,
                profilePicture: admin.profilePicture || ''
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login', error: error.message });
    }
};


// Fetch Admin Profile
exports.getProfile = async(req, res) => {
    try {
        console.log('Fetching profile for admin ID:', req.admin._id);

        const admin = await Admin.findById(req.admin._id).select('-password');
        if (!admin) {
            console.log('Admin not found:', req.admin._id);
            return res.status(404).json({ message: 'Admin not found' });
        }

        console.log('Profile fetched successfully for:', admin.email);

        res.status(200).json({
            success: true,
            admin: {
                id: admin._id,
                firstName: admin.firstName,
                lastName: admin.lastName,
                email: admin.email,
                mobile: admin.mobile,
                role: admin.role,
                bio: admin.bio,
                specialties: admin.specialties,
                experience: admin.experience,
                qualifications: admin.qualifications,
                languages: admin.languages,
                profilePicture: admin.profilePicture || ''
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Server error during profile fetch', error: error.message });
    }
};

// Update Admin Profile
exports.updateProfile = async(req, res) => {
    try {
        console.log('🔄 Update profile request for admin ID:', req.admin._id);
        console.log('📝 Request body:', req.body);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('❌ Validation errors:', errors.array());
            return res.status(400).json({
                success: false,
                errors: errors.array(),
                message: 'Validation failed'
            });
        }

        const {
            firstName,
            lastName,
            email,
            mobile,
            bio,
            specialties,
            experience,
            qualifications,
            languages
        } = req.body;

        // Prepare update data - only include provided fields
        const updateData = {};

        // Basic info fields (with validation)
        if (firstName !== undefined) updateData.firstName = firstName.trim();
        if (lastName !== undefined) updateData.lastName = lastName.trim();

        // Email - check uniqueness if changed
        if (email !== undefined && email !== req.admin.email) {
            const emailExists = await Admin.findOne({
                email: email.trim().toLowerCase(),
                _id: { $ne: req.admin._id } // Exclude current user
            });
            if (emailExists) {
                console.log('❌ Email already exists:', email);
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists'
                });
            }
            updateData.email = email.trim().toLowerCase();
        }

        if (mobile !== undefined) updateData.mobile = mobile.trim();

        // Professional fields - ALL USERS CAN UPDATE THESE
        if (bio !== undefined) {
            updateData.bio = bio.trim();
            console.log('📝 Updating bio:', updateData.bio.substring(0, 50) + (updateData.bio.length > 50 ? '...' : ''));
        }

        if (specialties !== undefined) {
            updateData.specialties = specialties.trim();
            console.log('🏷️ Updating specialties:', updateData.specialties.substring(0, 50) + (updateData.specialties.length > 50 ? '...' : ''));
        }

        if (experience !== undefined) {
            const expValue = parseInt(experience);
            updateData.experience = isNaN(expValue) || expValue < 0 ? 0 : expValue;
            console.log('⏱️ Updating experience:', updateData.experience, 'years');
        }

        if (qualifications !== undefined) {
            updateData.qualifications = qualifications.trim();
            console.log('🎓 Updating qualifications:', updateData.qualifications.substring(0, 50) + (updateData.qualifications.length > 50 ? '...' : ''));
        }

        if (languages !== undefined) {
            updateData.languages = languages.trim();
            console.log('🌐 Updating languages:', updateData.languages.substring(0, 50) + (updateData.languages.length > 50 ? '...' : ''));
        }

        // Handle profile picture upload if provided
        if (req.file) {
            if (!hasCloudinaryConfig) {
                console.error('Cloudinary configuration missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env');
                return res.status(500).json({
                    success: false,
                    message: 'Image upload service not configured'
                });
            }
            console.log('🖼️ Uploading profile picture to Cloudinary...');
            const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
            const uploadResult = await cloudinary.uploader.upload(dataUri, {
                folder: 'mindspace/profiles',
                resource_type: 'image'
            });
            updateData.profilePicture = uploadResult.secure_url;
            console.log('✅ Profile picture uploaded:', updateData.profilePicture);
        }

        console.log('📋 Final update data:', updateData);

        // Check if there's anything to update (allow update if only image is provided)
        if (!req.file && Object.keys(updateData).length === 0) {
            console.log('ℹ️ No fields to update');
            return res.status(400).json({
                success: false,
                message: 'No fields provided to update'
            });
        }

        // Update the admin document
        const updatedAdmin = await Admin.findByIdAndUpdate(
            req.admin._id, { $set: updateData }, {
                new: true,
                runValidators: true,
                context: 'query'
            }
        ).select('-password');

        if (!updatedAdmin) {
            console.log('❌ Admin not found for update:', req.admin._id);
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        console.log('✅ Profile updated successfully:', updatedAdmin.email);

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            admin: {
                id: updatedAdmin._id,
                firstName: updatedAdmin.firstName,
                lastName: updatedAdmin.lastName,
                email: updatedAdmin.email,
                mobile: updatedAdmin.mobile,
                role: updatedAdmin.role,
                bio: updatedAdmin.bio,
                specialties: updatedAdmin.specialties,
                experience: updatedAdmin.experience,
                qualifications: updatedAdmin.qualifications,
                languages: updatedAdmin.languages,
                profilePicture: updatedAdmin.profilePicture || ''
            }
        });
    } catch (error) {
        console.error('💥 Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during profile update',
            error: error.message
        });
    }
};