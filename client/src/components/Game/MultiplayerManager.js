import io from 'socket.io-client'

class MultiplayerManager {
    constructor(roomId) {
        this.roomId = roomId
        this.socket = io('http://localhost:3001')
        this.playerId = null
        this.isHost = false
        
        this.initializeSocket()
    }

    initializeSocket() {
        this.socket.emit('join-game', this.roomId)
        
        this.socket.on('player-assigned', (data) => {
            this.playerId = data.playerId
            this.isHost = data.isHost
        })

        this.socket.on('player-joined', (player) => {
            console.log('Player joined:', player)
        })

        this.socket.on('player-left', (playerId) => {
            console.log('Player left:', playerId)
        })

        this.socket.on('player-moved', (data) => {
            // Handle other player movements
            this.updateOtherPlayer(data)
        })

        this.socket.on('player-coins-updated', (data) => {
            // Update player coins display for host
            this.updatePlayerCoins(data)
        })
    }

    sendPlayerMovement(position, velocity, animation) {
        if (this.socket && this.playerId) {
            this.socket.emit('player-move', {
                roomId: this.roomId,
                playerId: this.playerId,
                position,
                velocity,
                animation
            })
        }
    }

    sendQuizResult(isCorrect) {
        if (this.socket && this.playerId) {
            this.socket.emit('quiz-result', {
                roomId: this.roomId,
                playerId: this.playerId,
                isCorrect
            })
        }
    }

    updateOtherPlayer(data) {
        // Update other players in the game
        if (window.gameScene && window.gameScene.updateOtherPlayer) {
            window.gameScene.updateOtherPlayer(data)
        }
    }

    updatePlayerCoins(data) {
        // Update coins display for host
        if (window.gameScene && window.gameScene.updatePlayerCoins) {
            window.gameScene.updatePlayerCoins(data)
        }
    }

    cleanup() {
        if (this.socket) {
            this.socket.emit('leave-game', this.roomId)
            this.socket.disconnect()
        }
    }
}

export default MultiplayerManager