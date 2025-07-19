const socket = io();  // to access the socket.io in frontend 

const game = new Chess();  // all rules and functions of chess game is here in the chess variable

const boardElement = document.querySelector(".chessboard");  // to access the chessboard

let draggedPiece = null;
let sourceSquare = null;
let PlayerRole = null;

const renderBoard = () => {
    const board = game.board();
    boardElement.innerHTML = "";

    board.forEach((row, rowIndex) => {
        row.forEach((square, squareIndex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add("square");

            if (rowIndex % 2 === squareIndex % 2) {
                squareElement.classList.add("light");
            } else {
                squareElement.classList.add("dark");
            }

            squareElement.dataset.row = rowIndex;
            squareElement.dataset.col = squareIndex;

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add("piece", square.color === "w" ? "white" : "black");
                pieceElement.innerHTML = getPieceUnicode(square);
                pieceElement.draggable = PlayerRole === square.color;

                pieceElement.addEventListener("dragstart", (e) => {
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowIndex, col: squareIndex };
                        e.dataTransfer.setData("text/plain", "");
                    }
                });

                pieceElement.addEventListener("dragend", (e) => {
                    draggedPiece = null;
                    sourceSquare = null;
                });

                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener("dragover", (e) => {
                e.preventDefault();
            });

            squareElement.addEventListener("drop", (e) => {
                e.preventDefault();
                if (draggedPiece) {
                    const targetSquare = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col),
                    };
                    handleMove(sourceSquare, targetSquare);
                }
            });

            boardElement.appendChild(squareElement);
        });
    });

    if (PlayerRole === "b") {
        boardElement.classList.add("flipped");
    } else {
        boardElement.classList.remove("flipped");
    }
};

const handleMove = (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: "q",
    };

    const result = game.move(move);  // Apply move locally
    if (result) {
        renderBoard();  // Refresh board
        socket.emit("move", move);  // Send move to server
    }
};

const getPieceUnicode = (piece) => {
    const unicodePiece = {
        p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚",
        P: "♙", N: "♘", B: "♗", R: "♖", Q: "♕", K: "♔",
    };
    return unicodePiece[piece.type] || "";
};

socket.on("playerRole", (role) => {
    PlayerRole = role;
    renderBoard();
});

socket.on("spectatorRole", () => {
    PlayerRole = null;
    renderBoard();
});

socket.on("boardState", (fen) => {
    game.load(fen);
    renderBoard();
});

socket.on("move", (move) => {
    game.move(move);
    renderBoard();
});

socket.on("gameOver", (data) => {
    let message = "";

    if (data.reason === "checkmate") {
        message = `Checkmate! ${data.winner} wins!`;
    } else if (data.reason === "stalemate") {
        message = "Stalemate! It's a draw.";
    } else if (data.reason === "draw") {
        message = "Game drawn!";
    }

    alert(message);

    boardElement.style.pointerEvents = "none";
});

renderBoard();
