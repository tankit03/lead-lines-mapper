const express = require('express');
const router = express.Router();
const db = require('../database');
const { broadcast } = require('../services/websocket'); 

// Middleware to check for authentication
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/login');
};

// This entire module now exports a function that accepts the `wss` instance
module.exports = (wss) => {
    // GET /dashboard
    router.get('/dashboard', isAuthenticated, (req, res) => {
        res.render('dashboard', {
            title: 'Dashboard',
            username: req.session.username,
        });
    });


    // GET all waypoints
    router.get('/waypoints', isAuthenticated, (req, res) => {
        const sql = 'SELECT id, lat, lng, userId, username FROM waypoints ORDER BY createdAt ASC';
        db.all(sql, [], (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch waypoints' });
            }
            res.json(rows);
        });
    });

    // POST a new waypoint
    router.post('/waypoints', isAuthenticated, (req, res) => {
        const { lat, lng } = req.body;
        const { userId, username } = req.session;

        if (!lat || !lng) {
            return res.status(400).json({ error: 'Latitude and longitude are required.' });
        }

        const sql = `INSERT INTO waypoints (lat, lng, userId, username) VALUES (?, ?, ?, ?)`;
        db.run(sql, [lat, lng, userId, username], function (err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to save waypoint.' });
            }

            const newWaypoint = { id: this.lastID, lat, lng, userId, username };
            
            // Broadcast the new waypoint to all clients
            broadcast({ type: 'new_waypoint', payload: newWaypoint });
            
            res.status(201).json(newWaypoint);
        });
    });

    // GET all paths
    router.get('/paths', isAuthenticated, (req, res) => {
        const sql = 'SELECT id, userId, username, pathData FROM paths ORDER BY createdAt ASC';
        db.all(sql, [], (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch paths' });
            }
            const paths = rows.map(row => ({
                ...row,
                path: JSON.parse(row.pathData) // Parse the JSON string into an object
            }));
            res.json(paths);
        });
    });

    // POST a new path
    router.post('/paths', isAuthenticated, (req, res) => {
        console.log('POST /paths called');
        console.log('Request body:', req.body);
        
        const { path } = req.body; // Expect an array of {lat, lng}
        const { userId, username } = req.session;
        
        console.log('Extracted path:', path);
        console.log('User info - ID:', userId, 'Username:', username);

        if (!path || !Array.isArray(path) || path.length < 2) {
            console.error('Invalid path data:', { path, isArray: Array.isArray(path), length: path?.length });
            return res.status(400).json({ error: 'A valid path with at least two points is required.' });
        }
        
        const pathDataJson = JSON.stringify(path);
        console.log('Path data JSON:', pathDataJson);
        
        const sql = `INSERT INTO paths (userId, username, pathData) VALUES (?, ?, ?)`;
        console.log('Executing SQL:', sql);
        console.log('SQL parameters:', [userId, username, pathDataJson]);

        db.run(sql, [userId, username, pathDataJson], function (err) {
            if (err) {
                console.error('Database error when saving path:', err);
                return res.status(500).json({ error: 'Failed to save path.' });
            }
            
            const newPath = { id: this.lastID, userId, username, path };
            console.log('Path saved to database successfully:', newPath);

            // Broadcast the new path to all clients
            try {
                broadcast({ type: 'new_path', payload: newPath });
                console.log('Path broadcasted successfully');
            } catch (broadcastError) {
                console.error('Error broadcasting path:', broadcastError);
            }
            
            res.status(201).json(newPath);
        });
    });
    
    // DELETE waypoint (remains the same)
    router.delete('/waypoints/:id', isAuthenticated, (req, res) => {
       // ... existing delete logic ...
    });

    // DELETE all waypoints for current user
    router.delete('/waypoints', isAuthenticated, (req, res) => {
        const { userId } = req.session;
        
        const sql = 'DELETE FROM waypoints WHERE userId = ?';
        db.run(sql, [userId], function (err) {
            if (err) {
                console.error('Error deleting waypoints:', err);
                return res.status(500).json({ error: 'Failed to delete waypoints' });
            }
            
            console.log(`Deleted ${this.changes} waypoints for user ${userId}`);
            res.json({ 
                message: 'All waypoints deleted successfully', 
                deletedCount: this.changes 
            });
        });
    });

    // DELETE all paths for current user
    router.delete('/paths', isAuthenticated, (req, res) => {
        const { userId } = req.session;
        
        const sql = 'DELETE FROM paths WHERE userId = ?';
        db.run(sql, [userId], function (err) {
            if (err) {
                console.error('Error deleting paths:', err);
                return res.status(500).json({ error: 'Failed to delete paths' });
            }
            
            console.log(`Deleted ${this.changes} paths for user ${userId}`);
            res.json({ 
                message: 'All paths deleted successfully', 
                deletedCount: this.changes 
            });
        });
    });

    // DELETE all waypoints AND paths for current user (bulk clear)
    router.delete('/clear-all', isAuthenticated, (req, res) => {
        const { userId } = req.session;
        
        // Start a transaction to delete both waypoints and paths
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            let waypointsDeleted = 0;
            let pathsDeleted = 0;
            let completed = 0;
            
            // Delete waypoints
            db.run('DELETE FROM waypoints WHERE userId = ?', [userId], function (err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Failed to delete waypoints' });
                }
                waypointsDeleted = this.changes;
                completed++;
                
                if (completed === 2) {
                    db.run('COMMIT');
                    console.log(`Bulk delete: ${waypointsDeleted} waypoints, ${pathsDeleted} paths for user ${userId}`);
                    res.json({
                        message: 'All data cleared successfully',
                        deletedWaypoints: waypointsDeleted,
                        deletedPaths: pathsDeleted
                    });
                }
            });
            
            // Delete paths
            db.run('DELETE FROM paths WHERE userId = ?', [userId], function (err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Failed to delete paths' });
                }
                pathsDeleted = this.changes;
                completed++;
                
                if (completed === 2) {
                    db.run('COMMIT');
                    console.log(`Bulk delete: ${waypointsDeleted} waypoints, ${pathsDeleted} paths for user ${userId}`);
                    res.json({
                        message: 'All data cleared successfully',
                        deletedWaypoints: waypointsDeleted,
                        deletedPaths: pathsDeleted
                    });
                }
            });
        });
    });

    return router;
};