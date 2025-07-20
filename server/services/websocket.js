// services/websocket.js
const WebSocket = require('ws');

let wss; // This will hold the WebSocket Server instance

/**
 * Initializes the WebSocket server and stores its instance.
 * @param {http.Server} server - The HTTP server instance.
 * @returns The WebSocket server instance.
 */
function initializeWebSocket(server) {
    wss = new WebSocket.Server({ server });

    wss.on('connection', (ws) => {
        console.log('Client connected to WebSocket');
        ws.on('close', () => {
            console.log('Client disconnected from WebSocket');
        });
    });

    console.log('WebSocket server has been initialized.');
    return { wss };
}

/**
 * Broadcasts data to all connected WebSocket clients.
 * @param {object} data - The data object to be sent.
 */
function broadcast(data) {
    if (!wss) {
        console.error("WebSocket server is not initialized. Cannot broadcast.");
        return;
    }

    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

module.exports = { initializeWebSocket, broadcast };