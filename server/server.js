
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth'); // Import auth routes


dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 5. Set up Session Management
app.use(
    session({
        store: new SQLiteStore({
            db: 'sessions.sqlite',
            dir: './database', // Change this to the new folder
            concurrentDB: true // Recommended for performance
        }),
        secret: process.env.SESSION_SECRET, // A secret key for signing the session ID cookie
        resave: false, // Don't save session if unmodified
        saveUninitialized: false, // Don't create session until something stored
        cookie: {
            maxAge: 1000 * 60 * 60 * 24, // 24 hours
            httpOnly: true, // Prevents client-side JS from reading the cookie
            secure: process.env.NODE_ENV === 'production' // Use secure cookies in production
        }
    })
);

// Middleware to make session data available to all templates
app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

app.use((req, res, next) => {
    res.locals.session = req.session;
    res.locals.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY; // Pass API key to views
    next();
});


// A public home page route
app.get('/', (req, res) => {
    res.render('index', { title: 'Home' });
});

// Use the authentication routes defined in routes/auth.js
app.use('/', authRoutes);

// 7. Start the Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});