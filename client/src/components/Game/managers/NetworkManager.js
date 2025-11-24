export class NetworkManager {
    constructor(scene) {
        this.scene = scene;
        this.playerUpdateRate = 50; // ms between movement updates
        this.lastPlayerUpdate = 0;
        this.lastSentMovement = null;
    }

    // client/src/components/Game/managers/NetworkManager.js

    update(time, delta) {
        // Handle quiz and respawning first
        if (this.scene.quizManager.isQuizActive() || this.scene.isRespawning) {
            return;
        }

        const localPlayer = this.scene.playerManager.getLocalPlayer();

        // CRITICAL: Spectators don't move or send updates
        if (localPlayer && localPlayer.isSpectator) {
            return;
        }

        // Update player movement (this handles input)
        if (localPlayer && this.scene.isPlayerReady) {
            localPlayer.update(time, delta);
        }

        // Send network updates
        const now = Date.now();
        if (now - this.lastPlayerUpdate > this.playerUpdateRate) {
            this.lastPlayerUpdate = now;
            this.sendPlayerMovementUpdate();
        }

        // Interpolate other players
        this.scene.playerManager.interpolateOtherPlayers(delta);
    }

    sendPlayerMovementUpdate() {
        const localPlayer = this.scene.playerManager.getLocalPlayer();

        // CRITICAL: Double-check spectator status
        if (!localPlayer || localPlayer.isSpectator) {
            return; // Spectators don't send movement
        }

        const sprite = localPlayer.getSprite();
        if (!sprite) return;

        let velocity = { x: 0, y: 0 };
        let position = { x: sprite.x || 0, y: sprite.y || 0 };
        let animation = 'idle';

        if (sprite.body) {
            velocity = {
                x: sprite.body.velocity.x || 0,
                y: sprite.body.velocity.y || 0
            };
        }

        if (sprite.anims && sprite.anims.currentAnim) {
            animation = sprite.anims.currentAnim.key;
        } else if (localPlayer.getNetworkAnimation) {
            animation = localPlayer.getNetworkAnimation();
        }

        // Only send if something changed significantly
        if (this.shouldSendMovementUpdate(position, velocity, animation)) {
            window.multiplayerManager.sendPlayerMovement(position, velocity, animation);
        }
    }

    shouldSendMovementUpdate(position, velocity, animation) {
        if (!this.lastSentMovement) {
            this.lastSentMovement = {
                position: position,
                velocity: velocity,
                animation: animation,
                timestamp: Date.now()
            };
            return true;
        }

        const now = Date.now();
        const timeSinceLastUpdate = now - this.lastSentMovement.timestamp;

        // Always send updates at minimum rate (50ms for real-time movement)
        if (timeSinceLastUpdate > 50) {
            this.lastSentMovement = {
                position: position,
                velocity: velocity,
                animation: animation,
                timestamp: now
            };
            return true;
        }

        // Check for significant changes
        const positionChanged =
            Math.abs(position.x - this.lastSentMovement.position.x) > 2 ||
            Math.abs(position.y - this.lastSentMovement.position.y) > 2;

        const velocityChanged =
            Math.abs(velocity.x - this.lastSentMovement.velocity.x) > 5 ||
            Math.abs(velocity.y - this.lastSentMovement.velocity.y) > 5;

        const animationChanged = animation !== this.lastSentMovement.animation;

        if (positionChanged || velocityChanged || animationChanged) {
            this.lastSentMovement = {
                position: position,
                velocity: velocity,
                animation: animation,
                timestamp: now
            };
            return true;
        }

        return false;
    }

    handleGameStateSync(data) {
        if (!data.players) return;

        data.players.forEach(playerData => {
            if (playerData.id !== this.scene.playerManager.getLocalPlayer()?.playerData?.id) {
                this.scene.playerManager.updateOtherPlayer({
                    playerId: playerData.id,
                    position: playerData.position,
                    velocity: playerData.velocity,
                    animation: playerData.animation,
                    timestamp: Date.now()
                });
            }
        });
    }
}
