const express = require('express');
const router = express.Router();


const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        // If there is a userId in the session, the user is authenticated
        return next();
    }
    res.redirect('/login');
};

// GET /dashboard - A page only accessible to logged-in users
router.get('/dashboard', isAuthenticated, (req, res) => {
    // The `isAuthenticated` middleware runs first. If the user is not logged in,
    // they will be redirected and this handler will not be called.
    res.render('dashboard', {
        title: 'Dashboard',
        username: req.session.username, // Pass username to the template
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
    });
});

module.exports = router;