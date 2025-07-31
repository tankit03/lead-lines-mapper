const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/login');
};

// GET profile page
router.get('/profile', isAuthenticated, (req, res) => {

    console.log("this is profile body:", req.body);
    console.log("this is email", req.session.email);

        res.render('profile', {
            title: 'Profile',
            email: req.session.email,
            username: req.session.username,
            session: req.session
        });
});

module.exports = router;