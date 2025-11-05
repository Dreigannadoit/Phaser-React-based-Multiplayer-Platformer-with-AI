// client/src/components/Game/MultiplayerManager.js
class MultiplayerManager {
    constructor(roomId, existingSocket = null) {
        this.roomId = roomId;
        this.socket = existingSocket;
        this.playerId = null;
        this.isHost = false;
        this.playerName = 'Player';
        this.hasJoined = false; // Track if we've already joined

        // Get player data from localStorage
        const storedData = JSON.parse(localStorage.getItem('playerData') || '{}');
        this.playerName = storedData.playerName || 'Player';
        this.isHost = storedData.isHost || false;

        console.log(`🎮 MultiplayerManager created for room ${roomId}, player: ${this.playerName}, host: ${this.isHost}`);

        // If socket is provided, set up listeners but don't join again
        if (this.socket) {
            this.setupSocketListeners();

            // Check if we're already in this room
            if (this.socket.connected) {
                this.checkExistingConnection();
            }
        }
    }

    checkExistingConnection() {
        console.log('🔍 Checking existing connection status...');

        // The server will send game-state automatically if we're already in the room
        // We just need to wait for it instead of re-joining

        // Set a timeout to detect if we don't receive game state
        this.connectionTimeout = setTimeout(() => {
            if (!this.playerId) {
                console.log('🔄 No existing connection found, joining room...');
                this.joinGame();
            }
        }, 2000);
    }

    setSocket(socket) {
        this.socket = socket;
        console.log('🔌 Socket set in MultiplayerManager');
        this.setupSocketListeners();

        if (this.socket.connected && !this.playerId) {
            this.checkExistingConnection();
        }
    }

    initializeSocket() {
        if (!this.socket) {
            console.error('❌ No socket available for MultiplayerManager');
            return;
        }

        if (!this.socket.connected) {
            console.warn('⚠️ Socket not connected, waiting for connection...');
            // Wait for connection
            this.socket.once('connect', () => {
                this.joinGame();
            });
            return;
        }

        this.joinGame();
    }

    joinGame() {
        if (this.hasJoined) {
            console.log('⚠️ Already joined game, skipping re-join');
            return;
        }

        console.log(`🎮 Joining game as ${this.playerName} (Host: ${this.isHost}) in room ${this.roomId}`);

        // Join game with player info
        this.socket.emit('join-game', {
            roomId: this.roomId,
            playerName: this.playerName,
            isHost: this.isHost
        });

        this.hasJoined = true;
    }

    setupSocketListeners() {
          this.socket.on('player-assigned', (data) => {
            this.playerId = data.playerId;
            this.isHost = data.isHost;
            console.log('✅ Player assigned:', data);
            
            // Clear the connection timeout since we're connected
            if (this.connectionTimeout) {
                clearTimeout(this.connectionTimeout);
            }
        });


        this.socket.on('game-state', (data) => {
            console.log('📊 Received game state:', data);

            // Wait a bit for the scene to be fully ready
            setTimeout(() => {
                if (window.gameScene && data.players) {
                    const localPlayerData = data.players.find(p => p.id === this.playerId);
                    if (localPlayerData) {
                        console.log('🎯 Setting local player from game state:', localPlayerData);
                        window.gameScene.setLocalPlayer(localPlayerData);
                    } else {
                        console.warn('❌ Local player data not found in game state');
                        console.log('Available players:', data.players.map(p => ({ id: p.id, name: p.name })));
                        console.log('Looking for playerId:', this.playerId);
                    }

                    // Create other players
                    data.players.forEach(player => {
                        if (player.id !== this.playerId) {
                            console.log('👥 Creating other player:', player.name);
                            window.gameScene.updateOtherPlayer({
                                playerId: player.id,
                                position: player.position,
                                velocity: player.velocity,
                                animation: player.animation
                            });
                        }
                    });
                } else {
                    console.warn('❌ Game scene not ready or no players in game state');
                    console.log('Game scene available:', !!window.gameScene);
                    console.log('Players in data:', data?.players?.length || 0);
                }
            }, 500);
        });

        this.socket.on('player-moved', (data) => {
            if (window.gameScene && data.playerId !== this.playerId) {
                window.gameScene.updateOtherPlayer(data);
            }
        });

        this.socket.on('player-joined', (player) => {
            console.log('👋 Player joined:', player.name);
            if (window.gameScene && player.id !== this.playerId) {
                window.gameScene.updateOtherPlayer({
                    playerId: player.id,
                    position: player.position,
                    velocity: player.velocity,
                    animation: player.animation
                });
            }
        });

        this.socket.on('player-left', (playerId) => {
            console.log('🚪 Player left:', playerId);
            if (window.gameScene) {
                window.gameScene.removePlayer(playerId);
            }
        });

        this.socket.on('coin-collected', (data) => {
            console.log('💰 Coin collected:', data);
            if (window.gameScene) {
                window.gameScene.updatePlayerCoins(data);
            }
        });

        this.socket.on('join-error', (error) => {
            console.error('❌ Join error:', error);
            alert(`Failed to join room: ${error}`);
        });

        this.socket.on('connect', () => {
            console.log('✅ Connected to server from Game');
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Disconnected from server from Game');
        });
    }

    sendPlayerMovement(position, velocity, animation) {
        if (this.socket && this.playerId) {
            this.socket.emit('player-move', {
                roomId: this.roomId,
                playerId: this.playerId,
                position,
                velocity,
                animation
            });
        }
    }

    sendCoinCollection(coinId) {
        if (this.socket && this.playerId) {
            this.socket.emit('collect-coin', {
                roomId: this.roomId,
                playerId: this.playerId,
                coinId: coinId
            });
        }
    }

    sendQuizResult(isCorrect) {
        if (this.socket && this.playerId) {
            this.socket.emit('quiz-result', {
                roomId: this.roomId,
                playerId: this.playerId,
                isCorrect
            });
        }
    }

    cleanup() {
        if (this.socket) {
            this.socket.emit('leave-game', this.roomId);
            // Don't disconnect the shared socket
        }
    }
}

export default MultiplayerManager;