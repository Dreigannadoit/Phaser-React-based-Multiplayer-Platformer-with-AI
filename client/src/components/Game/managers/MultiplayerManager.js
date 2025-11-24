// client/src/components/Game/MultiplayerManager.js
class MultiplayerManager {
    constructor(roomId, existingSocket = null) {
        this.roomId = roomId;
        this.socket = existingSocket;
        this.playerId = null;
        this.isHost = false;
        this.playerName = 'Player';
        this.hasJoined = false;
        this.isSpectator = false;

        // CRITICAL FIX: Load player data from localStorage correctly
        try {
            const storedData = JSON.parse(localStorage.getItem('playerData') || '{}');
            console.log('📂 Loaded player data from localStorage:', storedData);

            this.playerName = storedData.playerName || 'Player';
            this.isHost = storedData.isHost || false;

            // CRITICAL FIX: Regular players CANNOT be spectators
            // Only hosts can choose spectator mode
            this.isSpectator = (storedData.isHost && storedData.isSpectator) || false;

            console.log(`🎮 MultiplayerManager created for room ${roomId}, player: ${this.playerName}, host: ${this.isHost}, spectator: ${this.isSpectator}`);
        } catch (error) {
            console.error('❌ Error loading player data:', error);
            this.playerName = 'Player';
            this.isHost = false;
            this.isSpectator = false; // Default to player mode
        }


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

        try {
            const storedData = JSON.parse(localStorage.getItem('playerData') || '{}');

            // CRITICAL FIX: Regular players CANNOT be spectators
            if (!this.isHost) {
                this.isSpectator = false;
                console.log('🎯 Regular player - forcing spectator to false');
            } else {
                this.isSpectator = storedData.isSpectator || false;
            }

            console.log('🔄 Final spectator status:', this.isSpectator, 'isHost:', this.isHost);
        } catch (error) {
            console.error('❌ Error re-loading player data:', error);
            this.isSpectator = false; // Fallback to player mode for safety
        }

        console.log(`🎮 Joining game as ${this.playerName} (Host: ${this.isHost}, Spectator: ${this.isSpectator}) in room ${this.roomId}`);

        this.socket.emit('join-game', {
            roomId: this.roomId,
            playerName: this.playerName,
            isHost: this.isHost,
            isSpectator: this.isSpectator
        });

        this.hasJoined = true;
    }

    sendPlayerDeath() {
        if (this.socket && this.playerId) {
            console.log('💀 Sending player death to server');
            this.socket.emit('player-died', {
                roomId: this.roomId,
                playerId: this.playerId
            });
        }
    }

    setupSocketListeners() {
        this.socket.on('player-assigned', (data) => {
            this.playerId = data.playerId;
            this.isHost = data.isHost;

            // CRITICAL FIX: Always trust the server's spectator status
            if (data.isSpectator !== undefined) {
                this.isSpectator = data.isSpectator;
                console.log(`🎯 Updated spectator status from server: ${this.isSpectator}`);
            }

            // CRITICAL: Double-check regular players are never spectators
            if (!this.isHost && this.isSpectator) {
                console.error('❌ CRITICAL: Regular player marked as spectator by server - fixing');
                this.isSpectator = false;
            }

            console.log('✅ Player assigned:', data);
            console.log(`🎯 Final player status - Host: ${this.isHost}, Spectator: ${this.isSpectator}`);

            // Clear the connection timeout since we're connected
            if (this.connectionTimeout) {
                clearTimeout(this.connectionTimeout);
            }
        });

        this.socket.on('game-state', (data) => {
            console.log('📊 Received game state:', data);

            // Use a more reliable way to ensure scene is ready
            const setupPlayer = () => {
                if (window.gameScene && data.players) {
                    const localPlayerData = data.players.find(p => p.id === this.playerId);
                    if (localPlayerData) {
                        console.log('🎯 Setting local player from game state:', localPlayerData);

                        // CRITICAL FIX: Ensure spectator flag is passed to game scene
                        // Use server data first, then fallback to local data
                        const finalSpectatorStatus = localPlayerData.isSpectator !== undefined
                            ? localPlayerData.isSpectator
                            : this.isSpectator;

                        const playerDataWithSpectator = {
                            ...localPlayerData,
                            isSpectator: finalSpectatorStatus
                        };

                        console.log(`🎯 Final player data for game scene:`, playerDataWithSpectator);
                        window.gameScene.setLocalPlayer(playerDataWithSpectator);
                    } else {
                        console.warn('❌ Local player data not found in game state');
                        console.log('Available players:', data.players.map(p => ({ id: p.id, name: p.name, isSpectator: p.isSpectator })));
                        console.log('Looking for playerId:', this.playerId);

                        // Create fallback player data WITH SPECTATOR FLAG
                        const fallbackPlayerData = {
                            id: this.playerId,
                            name: this.playerName,
                            isHost: this.isHost,
                            isSpectator: this.isSpectator,
                            position: { x: 100, y: 200 },
                            velocity: { x: 0, y: 0 },
                            animation: 'idle',
                            color: 0xff6b6b
                        };
                        console.log('🔄 Using fallback player data:', fallbackPlayerData);
                        window.gameScene.setLocalPlayer(fallbackPlayerData);
                    }

                    // Create other players
                    data.players.forEach(player => {
                        if (player.id !== this.playerId) {
                            console.log('👥 Creating other player:', player.name);
                            window.gameScene.updateOtherPlayer({
                                playerId: player.id,
                                playerName: player.name,
                                position: player.position,
                                velocity: player.velocity,
                                animation: player.animation
                            });
                        }
                    });
                } else {
                    console.warn('❌ Game scene not ready, retrying...');
                    setTimeout(setupPlayer, 100);
                }
            };

            // Start the setup process
            setTimeout(setupPlayer, 100);
        });


        this.socket.on('scoreboard-update', (players) => {
            console.log('📊 Scoreboard data received:', players);
        });

        this.socket.on('player-moved', (data) => {
            if (window.gameScene && data.playerId !== this.playerId) {
                console.log(`📥 Received move for player ${data.playerName || data.playerId}:`, {
                    x: data.position.x,
                    y: data.position.y,
                    animation: data.animation
                });
                window.gameScene.updateOtherPlayer({
                    playerId: data.playerId,
                    playerName: data.playerName,
                    position: data.position,
                    velocity: data.velocity,
                    animation: data.animation,
                    timestamp: data.timestamp
                });
            }
        });

        this.socket.on('game-state-sync', (data) => {
            console.log('🔄 Received game state sync for large room');
            if (window.gameScene && window.gameScene.handleGameStateSync) {
                window.gameScene.handleGameStateSync(data);
            }
        });

        this.socket.on('player-joined', (player) => {
            console.log('👋 Player joined:', player.name);
            if (window.gameScene && player.id !== this.playerId) {
                window.gameScene.updateOtherPlayer({
                    playerId: player.id,
                    playerName: player.name,
                    position: player.position,
                    velocity: player.velocity,
                    animation: player.animation,
                    timestamp: Date.now()
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

        this.socket.on('player-coins-updated', (data) => {
            console.log('💰 Coin update received:', data);
            if (window.gameScene) {
                window.gameScene.updatePlayerCoins(data);
            }
        });

        this.socket.on('coin-collected', (data) => {
            console.log('💰 Coin collected event:', data);
        });
    }

    requestScoreboard() {
        if (this.socket && this.socket.connected) {
            console.log('📊 Requesting scoreboard data...');
            this.socket.emit('request-scoreboard');
        }
    }


    sendPlayerMovement(position, velocity, animation) {
        // SAFETY CHECK: Don't send movement if spectator
        if (this.isSpectator) {
            return; // Silent return for spectators
        }

        if (!this.socket || !this.playerId) {
            console.warn('❌ Cannot send movement: no socket or playerId');
            return;
        }

        // Validate position and velocity
        const safePosition = {
            x: position?.x || 0,
            y: position?.y || 0
        };

        const safeVelocity = {
            x: velocity?.x || 0,
            y: velocity?.y || 0
        };

        const safeAnimation = animation || 'idle';

        console.log(`🚀 SENDING movement for player ${this.playerId}:`, {
            position: safePosition,
            velocity: safeVelocity,
            animation: safeAnimation
        });

        this.socket.emit('player-move', {
            roomId: this.roomId,
            playerId: this.playerId,
            position: safePosition,
            velocity: safeVelocity,
            animation: safeAnimation,
            timestamp: Date.now()
        });
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
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        if (this.socket) {
            this.socket.emit('leave-game', this.roomId);
        }
    }
}

export default MultiplayerManager;