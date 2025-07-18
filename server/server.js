import { DB } from './connect.js';

import express from 'express';
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt';

const app = express();

app.set('view-engine', 'ejs');
app.use(express.urlencoded({extended: false}));

app.use(bodyParser.json());

app.get("/", (req,res) => {
    // res.status(200).json({success: true });
    // res.send("ready to find lead lines");
    res.render('index.ejs');
});
app.get("/login", (req,res) => {
    // res.status(200).json({success: true });
    // res.send("ready to find lead lines");
    res.render('login.ejs');
});

app.post("/login", (req,res) => {

});

app.get("/signup", (req,res) => {
    // res.status(200).json({success: true });
    // res.send("ready to find lead lines");
    res.render('signup.ejs');
});

app.post("/signup", async (req,res) => {

    try {

        const { username, email, password } = req.body;

        console.log("username", req.body.username);
        console.log("email", req.body.email);
        console.log("password", req.body.password);


        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`;

        const params = [username, email, hashedPassword];

        DB.run(sql, params, function(err) {
            if(err) {
                console.error("Database error: ", err.message);
                return res.redirect('/signup');
            }
            console.log(`Success ! A new user has been created with the username: ${username}`);
            res.redirect("/login");
        });

    } catch (error) {
        console.log("Error during signup:", error);
        res.redirect("/signup");
    }

});

app.listen(3000, (err) =>{
    if(err){
        console.log('ERROR: ', err.message);
    }
    console.log('LISTENING on port 3000');
})