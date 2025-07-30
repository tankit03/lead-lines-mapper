const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const http = require('http');

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session Management 
app.use(
    session({
        store: new SQLiteStore({
            db: 'sessions.sqlite',
            dir: './database',
            concurrentDB: true
        }),
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production'
        }
    })
);

// Middleware 
app.use((req, res, next) => {
    res.locals.session = req.session;
    res.locals.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    next();
});

app.use('/', authRoutes);
app.use('/', dashboardRoutes); 

// server start
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}/login`);
});