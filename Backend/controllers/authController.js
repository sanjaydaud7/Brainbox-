const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/emailService');

// Temporary storage for unverified users
const pendingUsers = new Map();

// Clear expired pending users every hour
setInterval(() => {
    const now = Date.now();
    for (const [email, userData] of pendingUsers.entries()) {
        if (userData.otpExpire < now) {
            pendingUsers.delete(email);
        }
    }
}, 60 * 60 * 1000);

// Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '24h'
    });
};

// Register user
exports.register = async(req, res, next) => {
    try {
        const { firstName, lastName, email, mobile, dob, password } = req.body;

        // Check if user already exists in database
        const userExists = await User.findOne({ $or: [{ email }, { mobile }] });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'User with this email or mobile already exists'
            });
        }

        // Check if user is already pending verification
        if (pendingUsers.has(email)) {
            return res.status(400).json({
                success: false,
                message: 'Registration already in progress. Please verify your email or request a new OTP.'
            });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
        const otpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Store user data temporarily (not in MongoDB yet)
        pendingUsers.set(email, {
            firstName,
            lastName,
            email,
            mobile,
            dob,
            password,
            otpToken: hashedOTP,
            otpExpire
        });

        // Create HTML template for OTP email
        const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #4073c0;">Brainbox</h1>
        </div>
        <div style="margin-bottom: 30px;">
          <h2 style="color: #333;">Verify Your Account</h2>
          <p>Thank you for registering with Brainbox. To complete your registration, please use the following OTP code:</p>
          <div style="background-color: #f5f7fa; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0; font-weight: bold; color: #4073c0;">
            ${otp}
          </div>
          <p>This code is valid for 10 minutes and can only be used once.</p>
        </div>
        <div style="color: #666; font-size: 14px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
          <p>If you didn't request this email, please ignore it.</p>
          <p>© ${new Date().getFullYear()} Brainbox. All rights reserved.</p>
        </div>
      </div>
    `;

        try {
            // Send OTP via email
            const emailResult = await sendEmail({
                to: email,
                subject: 'Brainbox Account Verification',
                text: `Your verification OTP is: ${otp}. This OTP is valid for 10 minutes.`,
                html: htmlContent
            });

            if (!emailResult.success) {
                // Email failed to send - remove from pending users
                pendingUsers.delete(email);
                console.error('Failed to send verification email:', emailResult.error);

                return res.status(500).json({
                    success: false,
                    message: 'Registration failed: Could not send verification email. Please try again later.'
                });
            }

            // Email sent successfully
            res.status(201).json({
                success: true,
                message: 'Registration initiated! Please verify your account with the OTP sent to your email.'
            });

        } catch (error) {
            console.error('Email error:', error);

            // Clean up pending user on email error
            pendingUsers.delete(email);

            return res.status(500).json({
                success: false,
                message: 'Registration failed: Email service error. Please try again later.'
            });
        }
    } catch (error) {
        console.error('Registration error:', error);
        next(error);
    }
};

// Verify OTP
exports.verifyOTP = async(req, res, next) => {
    try {
        const { email, otp } = req.body;

        // Check if user data exists in pending storage
        const pendingUserData = pendingUsers.get(email);
        if (!pendingUserData) {
            return res.status(400).json({
                success: false,
                message: 'No pending registration found for this email or OTP has expired'
            });
        }

        // Check if OTP has expired
        if (pendingUserData.otpExpire < Date.now()) {
            pendingUsers.delete(email);
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Please register again.'
            });
        }

        // Hash the received OTP and compare
        const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
        if (hashedOTP !== pendingUserData.otpToken) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP'
            });
        }

        // OTP is valid - now create the user in MongoDB
        try {
            const user = await User.create({
                firstName: pendingUserData.firstName,
                lastName: pendingUserData.lastName,
                email: pendingUserData.email,
                mobile: pendingUserData.mobile,
                dob: pendingUserData.dob,
                password: pendingUserData.password,
                isVerified: true // Mark as verified since OTP is confirmed
            });

            // Remove from pending storage
            pendingUsers.delete(email);

            // Generate token and send response
            const token = generateToken(user._id);

            res.status(200).json({
                success: true,
                message: 'Account verified and created successfully',
                token,
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email
                }
            });

        } catch (dbError) {
            console.error('Database error during user creation:', dbError);

            // Check if it's a duplicate key error
            if (dbError.code === 11000) {
                // Remove from pending storage
                pendingUsers.delete(email);
                return res.status(400).json({
                    success: false,
                    message: 'User with this email or mobile already exists'
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Account verification successful but failed to create account. Please try again.'
            });
        }

    } catch (error) {
        console.error('OTP verification error:', error);
        next(error);
    }
};

// Resend OTP
exports.resendOTP = async(req, res, next) => {
    try {
        const { email } = req.body;

        // Check if user data exists in pending storage
        const pendingUserData = pendingUsers.get(email);
        if (!pendingUserData) {
            return res.status(404).json({
                success: false,
                message: 'No pending registration found for this email'
            });
        }

        // Generate new OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
        const otpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Update the pending user data with new OTP
        pendingUserData.otpToken = hashedOTP;
        pendingUserData.otpExpire = otpExpire;

        // Create HTML template for OTP email
        const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #4073c0;">Brainbox</h1>
        </div>
        <div style="margin-bottom: 30px;">
          <h2 style="color: #333;">Verify Your Account</h2>
          <p>Here is your new verification OTP code:</p>
          <div style="background-color: #f5f7fa; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0; font-weight: bold; color: #4073c0;">
            ${otp}
          </div>
          <p>This code is valid for 10 minutes and can only be used once.</p>
        </div>
        <div style="color: #666; font-size: 14px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
          <p>If you didn't request this email, please ignore it.</p>
          <p>© ${new Date().getFullYear()} Brainbox. All rights reserved.</p>
        </div>
      </div>
    `;

        try {
            // Send new OTP via email
            const emailResult = await sendEmail({
                to: email,
                subject: 'Brainbox Account Verification - New OTP',
                text: `Your new verification OTP is: ${otp}. This OTP is valid for 10 minutes.`,
                html: htmlContent
            });

            if (!emailResult.success) {
                console.error('Failed to resend verification email:', emailResult.error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to send new OTP. Please try again later.'
                });
            }

            res.status(200).json({
                success: true,
                message: 'New OTP sent successfully to your email'
            });

        } catch (error) {
            console.error('Email error during resend:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to send new OTP. Please try again later.'
            });
        }

    } catch (error) {
        console.error('Resend OTP error:', error);
        next(error);
    }
};

// Login user
exports.login = async(req, res, next) => {
    try {
        const { email, password } = req.body;

        // Check if email and password are provided
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Find user with password
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if password matches
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if user is verified
        if (!user.isVerified) {
            // Generate new OTP
            const otp = user.generateOTP();
            await user.save();

            // Send OTP via email
            await sendEmail({
                to: email,
                subject: 'Brainbox Account Verification',
                text: `Your verification OTP is: ${otp}. This OTP is valid for 10 minutes.`
            });

            return res.status(401).json({
                success: false,
                message: 'Account not verified. A new OTP has been sent to your email.'
            });
        }

        // Generate token and send response
        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        next(error);
    }
};

// Forgot password
exports.forgotPassword = async(req, res, next) => {
    try {
        const { email } = req.body;

        // Find user
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No account with that email address exists'
            });
        }

        // Generate reset token
        const resetToken = user.getResetPasswordToken();
        await user.save();

        // Create reset URL
        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;

        // Send email
        try {
            await sendEmail({
                to: email,
                subject: 'Brainbox Password Reset',
                text: `You requested a password reset. Please go to this link to reset your password: ${resetUrl}
        
        If you didn't request this, please ignore this email.`
            });

            res.status(200).json({
                success: true,
                message: 'Password reset link sent to your email'
            });
        } catch (error) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();

            return res.status(500).json({
                success: false,
                message: 'Could not send reset email'
            });
        }
    } catch (error) {
        next(error);
    }
};

// Reset password
exports.resetPassword = async(req, res, next) => {
    try {
        // Get hashed token
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.resetToken)
            .digest('hex');

        // Find user with token
        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        // Set new password
        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password reset successful'
        });
    } catch (error) {
        next(error);
    }
};