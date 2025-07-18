import sqlite3 from 'sqlite3';
const sql3 = sqlite3.verbose();

// const DB = new sql3.Database(':memory:', sqlite3.OPEN_READWRITE, connected);
// const DB = new sql3.Database('', sqlite3.OPEN_READWRITE, connected);
const DB = new sql3.Database('./users.db', sqlite3.OPEN_READWRITE, connected);

function connected(err){
    if(err){
        console.log(err.message);
    } else {
        console.log("Created the DB");
    }

    userSetupTable();
}


function userSetupTable() {

    //SQL statement creates a new table named 'users' if it doesn't already exists.

    const sql = `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    `;

    //db.run which runs the SQL statment above.

    DB.run(sql, [], (err) => {
        if(err) {
            console.log("Error creating user's table");
            return;
        }
        console.log("Created table Users")

    });

}


export { DB };