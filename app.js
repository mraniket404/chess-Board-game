const express = require('express');
const socket = require('socket.io');
const http = require('http');
const { Chess } = require('chess.js');  // Importing Chess correctly

const app = express();

app.use(express.static('public'));  // Serve static files from /public
app.set('view engine', 'ejs');

const server = http.createServer(app);
const io = socket(server);

const game = new Chess();  // New game instance

// ✅ Fix: Use object instead of array
let players = {};  // Track white and black players by socket.id

app.get('/', (req, res) => {
    res.render('index', { title: "Chess Game" });
});
  
io.on('connection', (uniquesocket) => {
    console.log('A user connected:', uniquesocket.id);

    // Assign player roles
    if (!players.white) {
        players.white = uniquesocket.id;
        uniquesocket.emit("playerRole", "w");
        console.log("Assigned White:", uniquesocket.id);
    } else if (!players.black) {
        players.black = uniquesocket.id;
        uniquesocket.emit("playerRole", "b");
        console.log("Assigned Black:", uniquesocket.id);
    } else {
        uniquesocket.emit("spectatorRole");
        console.log("Assigned Spectator:", uniquesocket.id);
    }

    // Send the current board state
    uniquesocket.emit("boardState", game.fen());

    // On player disconnect
    uniquesocket.on("disconnect", () => {
        console.log('User disconnected:', uniquesocket.id);
        if (uniquesocket.id === players.white) {
            delete players.white;
            console.log("White player left");
        } else if (uniquesocket.id === players.black) {
            delete players.black;
            console.log("Black player left");
        }
    });

    // On player move
    uniquesocket.on("move", (move) => {
        try {
            const currentTurn = game.turn(); // 'w' or 'b'
            const currentPlayer = (currentTurn === "w") ? players.white : players.black;

            if (uniquesocket.id !== currentPlayer) {
                console.log("Not this player's turn.");
                return; // Not allowed to move
            }

            const result = game.move(move);
            if (result) {
                // Broadcast move and updated board state
                io.emit("move", move);
                io.emit("boardState", game.fen());
                console.log("Move played:", move);
            } else {
                uniquesocket.emit("invalidMove", move);
                console.log("Invalid move:", move);
            }
        } catch (err) {
            console.error("Error processing move:", err);
            uniquesocket.emit("invalidMove", move);
        }
    });
});

server.listen(3000, () => {
    console.log('✅ Server is running on port 3000');
});
