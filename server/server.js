const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const cors = require('cors')

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
})

app.use(cors())
app.use(express.json())

const rooms = new Map()

io.on('connection', (socket) => {
    console.log('User connected:', socket.id)

    // Join room
    socket.on('join-room', (roomId, playerName) => {
        socket.join(roomId)
        
        if (!rooms.has(roomId)) {
            rooms.set(roomId, {
                players: [],
                gameStarted: false
            })
        }

        const room = rooms.get(roomId)
        const isHost = playerName === 'HOST'
        const player = {
            id: socket.id,
            name: isHost ? 'Host' : playerName,
            isHost,
            ready: false,
            coins: 0,
            position: { x: 100, y: 200 }
        }

        room.players.push(player)
        socket.to(roomId).emit('player-joined', player)
        io.to(roomId).emit('players-updated', room.players)
        
        console.log(`Player ${playerName} joined room ${roomId}`)
    })

    // Start game
    socket.on('start-game', (roomId) => {
        const room = rooms.get(roomId)
        if (room) {
            room.gameStarted = true
            io.to(roomId).emit('game-started')
            console.log(`Game started in room ${roomId}`)
        }
    })

    // Player movement
    socket.on('player-move', (data) => {
        socket.to(data.roomId).emit('player-moved', data)
    })

    // Quiz results
    socket.on('quiz-result', (data) => {
        const room = rooms.get(data.roomId)
        if (room) {
            const player = room.players.find(p => p.id === data.playerId)
            if (player) {
                player.coins += data.isCorrect ? 1 : -1
                player.coins = Math.max(0, player.coins)
                
                // Send coin update to all clients (especially host)
                io.to(data.roomId).emit('player-coins-updated', {
                    playerId: data.playerId,
                    playerName: player.name,
                    coins: player.coins,
                    isCorrect: data.isCorrect
                })
            }
        }
    })

    // Leave room
    socket.on('leave-game', (roomId) => {
        const room = rooms.get(roomId)
        if (room) {
            room.players = room.players.filter(p => p.id !== socket.id)
            socket.to(roomId).emit('player-left', socket.id)
            io.to(roomId).emit('players-updated', room.players)
            
            if (room.players.length === 0) {
                rooms.delete(roomId)
            }
        }
        socket.leave(roomId)
    })

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id)
        // Clean up rooms
        for (const [roomId, room] of rooms.entries()) {
            room.players = room.players.filter(p => p.id !== socket.id)
            socket.to(roomId).emit('player-left', socket.id)
            io.to(roomId).emit('players-updated', room.players)
            
            if (room.players.length === 0) {
                rooms.delete(roomId)
            }
        }
    })
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})