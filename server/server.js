const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configure CORS for your Vite dev server (usually localhost:5173 or 3000)
const io = socketIo(server, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:3000"], // Vite dev servers
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(cors());
app.use(express.json());

// Store active rooms
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', (data) => {
        // Properly handle the join-room event by calling the same logic
        const { roomId, playerName, isHost } = data;

        if (!rooms.has(roomId)) {
            if (!isHost) {
                socket.emit('join-error', 'Room does not exist');
                return;
            }
            rooms.set(roomId, {
                players: [],
                gameStarted: false,
                coins: [],
                createdAt: new Date()
            });
        }

        const room = rooms.get(roomId);

        // ... rest of the join logic from join-game handler
        // OR simply call the same function:
        socket.emit('join-game', data); // But better to refactor the logic
    });

    // server/server.js - Update the join-game handler
    socket.on('join-game', (data) => {
        const { roomId, playerName, isHost } = data;

        console.log(`🎮 Join-game request:`, { roomId, playerName, isHost, socketId: socket.id });

        // Create room if it doesn't exist (allow host to create)
        if (!rooms.has(roomId)) {
            if (!isHost) {
                socket.emit('join-error', 'Room does not exist');
                console.log(`❌ Room ${roomId} doesn't exist and player is not host`);
                return;
            }
            // Host can create the room
            rooms.set(roomId, {
                players: [],
                gameStarted: false,
                coins: [],
                createdAt: new Date()
            });
            console.log(`✅ Room ${roomId} created by host`);
        }

        const room = rooms.get(roomId);
        console.log(`📊 Room ${roomId} currently has ${room.players.length} players`);

        // Check if this socket is already in the room (reconnection case)
        const existingPlayerIndex = room.players.findIndex(p => p.id === socket.id);
        if (existingPlayerIndex !== -1) {
            console.log(`🔄 Player ${playerName} reconnecting to room ${roomId}`);

            // Update the existing player's socket ID and data
            room.players[existingPlayerIndex] = {
                ...room.players[existingPlayerIndex],
                name: playerName,
                isHost: isHost,
                position: { x: 100, y: 200 }, // Reset position or keep existing?
                velocity: { x: 0, y: 0 },
                animation: 'idle'
            };

            // Send player assignment
            socket.emit('player-assigned', {
                playerId: socket.id,
                isHost: isHost
            });

            // Send current game state to the reconnecting player
            socket.emit('game-state', {
                players: room.players,
                coins: room.coins
            });

            // Notify other players about reconnection
            socket.to(roomId).emit('player-reconnected', room.players[existingPlayerIndex]);

            // Send updated player list to ALL players in the room
            io.to(roomId).emit('players-updated', room.players);

            console.log(`✅ Player ${playerName} reconnected to room ${roomId}`);
            return;
        }

        // Check if player name already exists in room (for different socket)
        const nameExists = room.players.some(p => p.name === playerName && p.id !== socket.id);
        if (nameExists) {
            socket.emit('join-error', 'Player name already taken in this room');
            console.log(`❌ Player name ${playerName} already exists in room ${roomId}`);
            return;
        }

        // Check if host already exists
        if (isHost && room.players.some(p => p.isHost)) {
            socket.emit('join-error', 'Room already has a host');
            console.log(`❌ Room ${roomId} already has a host`);
            return;
        }

        const player = {
            id: socket.id,
            name: playerName,
            isHost: isHost,
            ready: false,
            coins: 0,
            position: { x: 100, y: 200 },
            velocity: { x: 0, y: 0 },
            animation: 'idle',
            color: getRandomPlayerColor(),
            joinedAt: new Date()
        };

        room.players.push(player);
        socket.join(roomId);

        console.log(`✅ Player ${player.name} added to room ${roomId}`);

        // Send player assignment
        socket.emit('player-assigned', {
            playerId: socket.id,
            isHost: isHost
        });

        // Send current game state to the new player
        socket.emit('game-state', {
            players: room.players,
            coins: room.coins
        });

        // Notify other players in the room
        socket.to(roomId).emit('player-joined', player);

        // Send updated player list to ALL players in the room (including the new one)
        io.to(roomId).emit('players-updated', room.players);

        console.log(`🎉 Player ${player.name} joined game in room ${roomId}`);
        console.log(`👥 Room ${roomId} now has ${room.players.length} players`);
    });


    // Player movement
    socket.on('player-move', (data) => {
        const room = rooms.get(data.roomId);
        if (room) {
            const player = room.players.find(p => p.id === data.playerId);
            if (player) {
                player.position = data.position;
                player.velocity = data.velocity;
                player.animation = data.animation;

                // Broadcast to other players
                socket.to(data.roomId).emit('player-moved', {
                    playerId: data.playerId,
                    position: data.position,
                    velocity: data.velocity,
                    animation: data.animation
                });
            }
        }
    });

    // Coin collection
    socket.on('collect-coin', (data) => {
        const room = rooms.get(data.roomId);
        if (room && room.coins) {
            // Remove the coin from the room's available coins
            room.coins = room.coins.filter(coin => coin.id !== data.coinId);

            // Update player coins
            const player = room.players.find(p => p.id === data.playerId);
            if (player) {
                player.coins += 1;

                // Broadcast coin collection to all players
                io.to(data.roomId).emit('coin-collected', {
                    playerId: data.playerId,
                    playerName: player.name,
                    coinId: data.coinId,
                    newCoinCount: player.coins
                });

                // Also update coins for host/spectators
                io.to(data.roomId).emit('player-coins-updated', {
                    playerId: data.playerId,
                    playerName: player.name,
                    coins: player.coins
                });
            }
        }
    });

    // Start game
    socket.on('start-game', (roomId) => {
        const room = rooms.get(roomId);
        if (room) {
            room.gameStarted = true;
            room.coins = generateCoinsFromMap();

            console.log(`🎮 Game started in room ${roomId} with ${room.players.length} players`);

            // Tell ALL players to navigate to the game
            io.to(roomId).emit('navigate-to-game', {
                roomId: roomId
            });

            console.log(`📢 Sent navigate-to-game to ${room.players.length} players`);
        }
    });

    // Player movement
    socket.on('player-move', (data) => {
        socket.to(data.roomId).emit('player-moved', data);
    });

    // Quiz results
    socket.on('quiz-result', (data) => {
        const room = rooms.get(data.roomId);
        if (room) {
            const player = room.players.find(p => p.id === data.playerId);
            if (player) {
                player.coins += data.isCorrect ? 1 : -1;
                player.coins = Math.max(0, player.coins);

                // Send coin update to all clients (especially host)
                io.to(data.roomId).emit('player-coins-updated', {
                    playerId: data.playerId,
                    playerName: player.name,
                    coins: player.coins,
                    isCorrect: data.isCorrect
                });

                console.log(`Player ${player.name} now has ${player.coins} coins`);
            }
        }
    });

    // Player ready status
    socket.on('player-ready', (roomId, isReady) => {
        const room = rooms.get(roomId);
        if (room) {
            const player = room.players.find(p => p.id === socket.id);
            if (player) {
                player.ready = isReady;
                io.to(roomId).emit('players-updated', room.players);
            }
        }
    });

    // Leave room
    socket.on('leave-game', (roomId) => {
        leaveRoom(socket, roomId);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Clean up all rooms this user was in
        for (const [roomId, room] of rooms.entries()) {
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                leaveRoom(socket, roomId);
            }
        }
    });


    function leaveRoom(socket, roomId) {
        const room = rooms.get(roomId)
        if (room) {
            const playerIndex = room.players.findIndex(p => p.id === socket.id)
            if (playerIndex !== -1) {
                const player = room.players[playerIndex]
                room.players.splice(playerIndex, 1)

                socket.to(roomId).emit('player-left', socket.id)
                io.to(roomId).emit('players-updated', room.players)

                console.log(`Player ${player.name} left room ${roomId}`)

                // DON'T delete room immediately - wait a bit for reconnection
                if (room.players.length === 0) {
                    setTimeout(() => {
                        const roomStillEmpty = rooms.get(roomId)?.players.length === 0
                        if (roomStillEmpty) {
                            rooms.delete(roomId)
                            console.log(`Room ${roomId} deleted (empty)`)
                        }
                    }, 5000) // Wait 5 seconds before deleting empty room
                }
            }
        }
        socket.leave(roomId)
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        activeRooms: rooms.size,
        totalPlayers: Array.from(rooms.values()).reduce((acc, room) => acc + room.players.length, 0)
    });
});

// Get room info endpoint
app.get('/room/:roomId', (req, res) => {
    const room = rooms.get(req.params.roomId);
    if (room) {
        res.json({
            exists: true,
            players: room.players.length,
            gameStarted: room.gameStarted
        });
    } else {
        res.json({ exists: false });
    }
});

// Helper functions
function getRandomPlayerColor() {
    const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4, 0xfeca57, 0xff9ff3];
    return colors[Math.floor(Math.random() * colors.length)];
}

function generateCoinsFromMap() {
    // This should match your map.json coin positions
    // For now, return some default positions
    return [
        { id: 'coin_1', x: 250, y: 400 },
        { id: 'coin_2', x: 550, y: 330 },
        { id: 'coin_3', x: 350, y: 250 },
        { id: 'coin_4', x: 650, y: 200 },
        { id: 'coin_5', x: 450, y: 500 },
        { id: 'coin_6', x: 150, y: 350 }
    ].map(coin => ({ ...coin, collected: false }));
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Multiplayer server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
});