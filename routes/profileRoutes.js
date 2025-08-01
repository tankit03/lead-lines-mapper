const express = require('express');
const bcrypt = require('bcrypt');
const { use } = require('passport');
const db = require('../database'); 
const router = express.Router();

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/login');
};

function runQuery(sql, params = []){
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err){
            if(err){
                reject(err)
            }
            else{
                resolve(this);
            }
        })
    })
}

// Helper function to get user data
async function getUserData(userId) {
    return new Promise((resolve, reject) => {
        db.get('SELECT email, username FROM users WHERE id = ?', [userId], (err, user) => {
            if (err) reject(err);
            else resolve(user);
        });
    });
}

// GET profile page
router.get('/profile', isAuthenticated, async (req, res) => {
    const userId = req.session.userId;
    console.log("this is userId", userId);

    try {
        const userData = await getUserData(userId);
        if (!userData) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        console.log("this is user", userData);
        res.render('profile', {
            title: 'Profile',
            email: userData.email,
            username: userData.username,
            session: req.session
        });
    } catch (error) {
        console.error('Database error:', error);
        return res.status(500).json({ error: 'Database error' });
    }
});

// POST route to update username
router.post('/update-username', isAuthenticated, async (req, res) => {
    const { username } = req.body;
    const userId = req.session.userId;

    try {
        // Check if username already exists
        const existingUser = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM users WHERE username = ? AND id != ?', [username, userId], (err, user) => {
                if (err) reject(err);
                else resolve(user);
            });
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Username already taken.' });
        }

        // Update username
        await runQuery('UPDATE users SET username = ? WHERE id = ?', [username, userId]);

        // Update session
        req.session.username = username;

        // Return success response
        res.json({ 
            success: true, 
            message: 'Username updated successfully!',
            username: username 
        });

    } catch (error) {
        console.error('Error updating username:', error);
        res.status(500).json({ error: 'An error occurred while updating username.' });
    }
});

// POST route to update email
router.post('/update-email', isAuthenticated, async (req, res) => {
    const { email } = req.body;
    const userId = req.session.userId;

    try {
        // Check if email already exists
        const existingUser = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId], (err, user) => {
                if (err) reject(err);
                else resolve(user);
            });
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Email already taken.' });
        }

        // Update email
        await runQuery('UPDATE users SET email = ? WHERE id = ?', [email, userId]);

        // Return success response
        res.json({ 
            success: true, 
            message: 'Email updated successfully!',
            email: email 
        });

    } catch (error) {
        console.error('Error updating email:', error);
        res.status(500).json({ error: 'An error occurred while updating email.' });
    }
});

// POST route to update password
router.post('/update-password', isAuthenticated, async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.session.userId;

    try {
        // Validate that new password and confirm password match
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ error: 'New passwords do not match.' });
        }

        // Get current user data including password
        const currentUser = await new Promise((resolve, reject) => {
            db.get('SELECT password FROM users WHERE id = ?', [userId], (err, user) => {
                if (err) reject(err);
                else resolve(user);
            });
        });

        if (!currentUser) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Verify current password
        const currentPasswordMatch = await bcrypt.compare(currentPassword, currentUser.password);
        if (!currentPasswordMatch) {
            return res.status(400).json({ error: 'Current password is incorrect.' });
        }

        // Hash new password
        const saltRounds = 10;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await runQuery('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, userId]);

        // Return success response
        res.json({ 
            success: true, 
            message: 'Password updated successfully!'
        });

    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ error: 'An error occurred while updating password.' });
    }
});

// POST route to delete account
router.post('/delete-account', isAuthenticated, async (req, res) => {
    const userId = req.session.userId;

    try {
        // Delete user account
        await runQuery('DELETE FROM users WHERE id = ?', [userId]);

        // Destroy session
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
                return res.status(500).json({ error: 'Error logging out after account deletion.' });
            }
            
            // Return success response
            res.json({ 
                success: true, 
                message: 'Account deleted successfully!',
                redirectTo: '/login'
            });
        });

    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ error: 'An error occurred while deleting account.' });
    }
});

module.exports = router;