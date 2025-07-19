const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../database'); // Import the database connection

const router = express.Router();
const saltRounds = 10;

// Middleware to check if user is authenticated 
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        // If there is a userId in the session, the user is authenticated
        return next();
    }
    res.redirect('/login');
};

// registration route
// GET /register - Display the registration form
router.get('/register', (req, res) => {
    res.render('register', { title: 'Register', error: null });
});

// login routes
// GET /login - Display the login form
router.get('/login', (req, res) => {
    res.render('login', { title: 'Login', error: null });
});


// POST /register - Handle registration logic
router.post('/register', async (req, res) => {
    const { email, username, password } = req.body;

    // Basic validation
    if (!email || !username || !password) {
        return res.render('register', { title: 'Register', error: 'All fields are required.' });
    }

    try {
        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // SQL query to insert the new user
        const sql = `INSERT INTO users (email, username, password) VALUES (?, ?, ?)`;
        db.run(sql, [email, username, hashedPassword], function(err) {
            if (err) {
                // Check for UNIQUE constraint violation (email or username already exists)
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.render('register', { title: 'Register', error: 'Email or username already taken.' });
                }
                console.error(err.message);
                return res.render('register', { title: 'Register', error: 'An error occurred during registration.' });
            }
            res.redirect('/login');
        });
    } catch (error) {
        console.error(error);
        res.render('register', { title: 'Register', error: 'An unexpected error occurred.' });
    }
});

// POST /login - Handle login logic
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.render('login', { title: 'Login', error: 'Email and password are required.' });
    }

    const sql = `SELECT * FROM users WHERE email = ?`;
    db.get(sql, [email], async (err, user) => {
        if (err) {
            console.error(err.message);
            return res.render('login', { title: 'Login', error: 'An error occurred.' });
        }
        // If no user is found with that email
        if (!user) {
            return res.render('login', { title: 'Login', error: 'Invalid email or password.' });
        }

        // Compare the submitted password with the hashed password from the database
        const match = await bcrypt.compare(password, user.password);

        if (match) {
            // Passwords match! Create a session for the user.
            req.session.userId = user.id;
            req.session.username = user.username;
            // Redirect to the protected dashboard
            res.redirect('/dashboard');
        } else {
            // Passwords do not match
            res.render('login', { title: 'Login', error: 'Invalid email or password.' });
        }
    });
});

// logout route
// POST /logout - Handle logout logic
router.post('/logout', (req, res) => {
   
    req.session.destroy((err) => {
        if (err) {
            return res.redirect('/dashboard');
        }
        // Clear the cookie and redirect to the login page
        res.clearCookie('connect.sid'); 
        res.redirect('/login');
    });
});

module.exports = router;
