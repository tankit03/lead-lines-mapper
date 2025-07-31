const sqlite3 = require('sqlite3').verbose();
const DBSOURCE = "./database/users.sqlite";

const db = new sqlite3.Database(DBSOURCE, (err) => {
    if (err) {
        console.error(err.message);
        throw err;
    } else {
        console.log('Connected to the SQLite database.');
        db.serialize(() => {

            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                CONSTRAINT email_unique UNIQUE (email),
                CONSTRAINT username_unique UNIQUE (username)
            )`, (err) => {
                if (err) {
                    console.log('Users table already exists or an error occurred.');
                } else {
                    console.log('Users table created successfully.');
                }
            });

            db.run(`CREATE TABLE IF NOT EXISTS waypoints (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                userId INTEGER NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
            )`, (err) => {
                if (err) {
                    console.error('Error creating waypoints table:', err.message);
                } else {
                    console.log('Waypoints table created successfully.');
                }
            });

            db.run(`CREATE TABLE IF NOT EXISTS paths (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                pathData TEXT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
            )`, (err) => {
                if (err) {
                    console.error('Error creating paths table:', err.message);
                } else {
                    console.log('Paths table created successfully.');
                }
            });
        });
    }
});

module.exports = db;
