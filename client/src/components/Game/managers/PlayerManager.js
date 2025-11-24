import { MultiplayerPlayer } from "../entities/MultiplayerPlayer";
import { Player } from "../entities/Player";

export class PlayerManager {
    constructor(scene) {
        this.scene = scene;
        this.localPlayer = null;
        this.otherPlayers = new Map();
        this.otherPlayerUpdateTimes = new Map();
        this.maxPlayers = 50;
    }

    // client/src/components/Game/managers/PlayerManager.js

    setLocalPlayer(playerData) {
        console.log('🎯 PlayerManager setting local player:', playerData);

        // CRITICAL: Handle spectator case
        if (playerData.isSpectator) {
            console.log('🎯 Creating spectator object (no physics body)');
            this.localPlayer = {
                playerData: playerData,
                isSpectator: true,
                getSprite: () => null,
                update: () => { }, // RESTORE THIS - empty update for spectators
                getNetworkAnimation: () => 'idle',
                takeDamage: () => { }
            };
            this.scene.isPlayerReady = true;
            return;
        }

        // Regular player creation - create actual Player instance with movement
        console.log('🎯 Creating regular player character WITH MOVEMENT');
        const spawnPosition = this.scene.mapManager.getSpawnPosition();

        // Create the actual Player class instance (this has update method for movement)
        const player = new Player(this.scene, spawnPosition.x, spawnPosition.y);
        player.playerData = playerData;
        player.isSpectator = false;

        this.localPlayer = player;
        this.scene.isPlayerReady = true;

        console.log('✅ Regular player created with physics body and movement controls');
    }

    convertToControlledPlayer() {
        // CRITICAL: Don't convert spectators
        if (this.localPlayer && this.localPlayer.isSpectator) {
            console.log('🎯 Skipping conversion for spectator');
            return;
        }

        if (!this.localPlayer) return;

        const sprite = this.localPlayer.getSprite();
        const playerData = this.localPlayer.playerData;

        // Store the current position
        const currentX = sprite.x;
        const currentY = sprite.y;

        this.localPlayer.destroy();

        // Create controlled player at the same position
        this.localPlayer = new Player(this.scene, currentX, currentY);
        this.localPlayer.playerData = playerData;

        // Set up collisions again
        this.scene.collisionManager.setupPlayerCollisions(this.localPlayer);

        // Make camera follow new player
        this.scene.cameras.main.startFollow(this.localPlayer.getSprite());

        // Ensure physics body is enabled
        if (this.localPlayer.getSprite() && this.localPlayer.getSprite().body) {
            this.localPlayer.getSprite().body.enable = true;
        }
    }

    updateOtherPlayer(data) {
        const { playerId, position, velocity, animation, timestamp, playerName } = data;

        if (playerId === this.localPlayer?.playerData?.id) {
            return; // Don't update local player from network
        }

        let otherPlayer = this.otherPlayers.get(playerId);

        if (!otherPlayer) {
            // Create new remote player with pooling consideration
            if (this.otherPlayers.size >= this.maxPlayers) {
                console.warn(`Player limit reached (${this.maxPlayers}), cannot create new player`);
                return;
            }

            // Use provided position or default to spawn area
            const spawnPosition = this.scene.mapManager.getSpawnPosition();

            const playerData = {
                id: playerId,
                name: playerName || `Player${this.generateUniqueSuffix(playerId)}`,
                position: position || spawnPosition,
                velocity: velocity,
                animation: animation,
                color: this.getPlayerColor(playerId)
            };

            otherPlayer = new MultiplayerPlayer(this.scene, playerData, false);
            this.otherPlayers.set(playerId, otherPlayer);

            console.log(`👥 Created remote player ${playerData.name} (${playerId}) at (${playerData.position.x}, ${playerData.position.y})`);
        } else {
            // Update existing player name if provided and different
            if (playerName && otherPlayer.playerData.name !== playerName) {
                console.log(`🔄 Updating player ${playerId} name from "${otherPlayer.playerData.name}" to "${playerName}"`);
                otherPlayer.playerData.name = playerName;

                // Update the name text display
                if (otherPlayer.nameText) {
                    otherPlayer.nameText.setText(playerName);
                }
            }
        }

        // Store update time for interpolation
        this.otherPlayerUpdateTimes.set(playerId, {
            timestamp: timestamp || Date.now(),
            position: position,
            velocity: velocity
        });

        // Update player with new data
        otherPlayer.update({
            ...otherPlayer.playerData,
            position,
            velocity,
            animation
        }, timestamp || Date.now());
    }

    generateUniqueSuffix(playerId) {
        return playerId.slice(-4);
    }

    getPlayerColor(playerId) {
        const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4, 0xfeca57, 0xff9ff3, 0x54a0ff, 0x5f27cd, 0x00d2d3, 0xff9f43];
        let hash = 0;
        for (let i = 0; i < playerId.length; i++) {
            hash = playerId.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }

    removePlayer(playerId) {
        const player = this.otherPlayers.get(playerId);
        if (player) {
            player.destroy();
            this.otherPlayers.delete(playerId);
            this.otherPlayerUpdateTimes.delete(playerId);
            console.log(`🗑️ Removed player ${playerId}`);
        }
    }

    interpolateOtherPlayers(delta) {
        const now = Date.now();

        this.otherPlayers.forEach((player, playerId) => {
            if (!player.interpolatePosition) return;

            const updateData = this.otherPlayerUpdateTimes.get(playerId);
            if (!updateData) return;

            // Use delta time for smooth interpolation
            player.interpolatePosition(delta, now);
        });
    }

    getLocalPlayer() {
        return this.localPlayer;
    }

    isLocalPlayerSpectator() {
        return this.localPlayer && this.localPlayer.isSpectator;
    }

    getOtherPlayers() {
        return this.otherPlayers;
    }
}