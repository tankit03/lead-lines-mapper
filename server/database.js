
// connection to the SQLite database.

const sqlite3 = require('sqlite3').verbose();
const DBSOURCE = "./database/users.sqlite";

// Create a new database instance.
// The 'verbose()' part provides more detailed stack traces for debugging.
const db = new sqlite3.Database(DBSOURCE, (err) => {
    if (err) {
        // Cannot open database
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
        });
    }
});

// Export the database connection object.
module.exports = db;
