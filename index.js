const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const cookie = require('cookie');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

const db = new sqlite3.Database(':memory:', (err) => {
    if (err) console.error('Error opening database:', err.message);
    db.run('CREATE TABLE messages (id INTEGER PRIMARY KEY AUTOINCREMENT, message TEXT)');
});

app.use(express.static('public'));

app.use((req, res, next) => {
    req.cookies = cookie.parse(req.headers.cookie || '');
    next();
});

function generateUsername() {
    const randomNum = Math.floor(Math.random() * 10000);
    return `anonymous#${String(randomNum).padStart(4, '0')}`;
}

io.on('connection', (socket) => {
    const cookies = socket.request.headers.cookie ? cookie.parse(socket.request.headers.cookie) : {};
    let username = cookies.username;

    if (!username) {
        username = generateUsername();
        socket.emit('set username', username);
    }

    db.all('SELECT message FROM messages ORDER BY id DESC LIMIT 50', [], (err, rows) => {
        if (err) throw err;
        rows.reverse().forEach(row => socket.emit('chat message', row.message));
    });

    socket.on('chat message', (msg) => {
        const message = `${username}: ${msg}`;
        db.run('INSERT INTO messages (message) VALUES (?)', message);
        io.emit('chat message', message);
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
