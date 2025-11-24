// client/src/components/Game/CollisionManager.js
export class CollisionManager {
    constructor(scene) {
        this.scene = scene;
        this.mapManager = scene.mapManager;
    }

    setupPlayerCollisions(player) {
        if (!player) {
            console.warn('❌ Player is null for collision setup');
            return;
        }

        if (player.isSpectator) {
            console.log('🎯 Skipping collision setup for spectator');
            return;
        }

        const sprite = player.getSprite ? player.getSprite() : null;
        if (!sprite) {
            console.warn('❌ Player sprite not available for collisions');
            return;
        }

        console.log('🔄 Setting up player collisions...');

        // Clear any existing colliders for this player
        this.scene.physics.world.colliders.destroy();

        // Set up ground collisions
        const collisionObjects = this.mapManager.getCollisionObjects();
        if (collisionObjects) {
            this.scene.physics.add.collider(sprite, collisionObjects);
            console.log('✅ Ground collisions set up');
        }

        // Set up coin collection
        const coins = this.mapManager.getCoins();
        if (coins && coins.getLength() > 0) {
            this.scene.physics.add.overlap(sprite, coins, this.collectCoin.bind(this), this.checkCoinOverlap.bind(this), this);
            console.log(`💰 Coin collisions set up (${coins.getLength()} coins)`);
        }

        // Set up spike damage
        const spikes = this.mapManager.getSpikes();
        if (spikes) {
            this.scene.physics.add.overlap(sprite, spikes, this.hitSpike.bind(this), null, this);
            console.log('💥 Spike collisions set up');
        }

        console.log('✅ All collisions set up for player');
    }

    // Custom overlap check for coins
    checkCoinOverlap(player, coin) {
        if (!coin.active) return false;

        const playerBounds = player.getBounds();
        const coinBounds = coin.getBounds();

        const isOverlapping = Phaser.Geom.Rectangle.Overlaps(playerBounds, coinBounds);

        if (isOverlapping) {
            console.log(`🎯 Coin overlap detected at (${coin.x}, ${coin.y})`);
        }

        return isOverlapping;
    }

    collectCoin(player, coin) {
        console.log(`💰 Coin collected! Position: (${coin.x}, ${coin.y})`);

        // Disable the coin immediately to prevent multiple collections
        if (coin.active) {
            coin.disableBody(true, true);
            console.log(`🪙 Coin disabled: ${coin.x}, ${coin.y}`);
        }

        if (this.scene.isMultiplayer) {
            this.handleMultiplayerCoin(player, coin);
        } else {
            this.handleSinglePlayerCoin(player, coin);
        }
    }

    async handleMultiplayerCoin(player, coin) {
        console.log('🎮 Multiplayer coin collection');
        const coinId = this.findCoinId(coin);

        if (coinId && window.multiplayerManager) {
            // Notify server about coin collection
            window.multiplayerManager.sendCoinCollection(coinId);

            console.log(`🪙 Sent coin collection to server, waiting for update...`);

            // Show quiz for this player only
            await this.scene.handleMultiplayerCoin(coin);
        } else {
            console.warn('❌ Cannot process multiplayer coin - missing manager or coin ID');
        }
    }

    async handleSinglePlayerCoin(player, coin) {
        console.log('🎯 Single player coin collection');
        await this.scene.handleSinglePlayerCoin(coin);
    }

    findCoinId(coin) {
        // Generate a unique ID based on coin position
        return `coin_${Math.round(coin.x)}_${Math.round(coin.y)}`;
    }

    hitSpike(player, spike) {
        console.log('💥 Player hit spike!');

        const playerInstance = this.getPlayerFromSprite(player);

        if (!playerInstance) {
            console.warn('❌ Could not find player instance for spike damage');
            return;
        }

        // Don't process damage if player is already dead/respawning
        if (this.scene.isRespawning) {
            return;
        }

        this.scene.lives -= spike.damage;
        console.log(`💔 Lives remaining: ${this.scene.lives}`);

        // Pass spike position for directional knockback
        playerInstance.takeDamage(spike);

        this.scene.emitGameStateUpdate();
        this.scene.cameras.main.shake(100, 0.01);

        // NEW: Let PlatformerScene handle death/respawn logic
        if (this.scene.lives <= 0) {
            console.log('🎮 Player died!');
            // PlatformerScene will handle the respawn process in update()
        }
    }

    // Helper method to get player instance from sprite
    getPlayerFromSprite(sprite) {
        const localPlayer = this.scene.playerManager.getLocalPlayer();

        // If localPlayer is the actual Player instance
        if (localPlayer && localPlayer.getSprite && localPlayer.getSprite() === sprite) {
            return localPlayer;
        }

        // If localPlayer is a wrapper object
        if (localPlayer && localPlayer.getSprite && localPlayer.getSprite() === sprite) {
            return localPlayer;
        }

        // Check other players if needed
        const otherPlayers = this.scene.playerManager.getOtherPlayers();
        for (let [playerId, player] of otherPlayers) {
            if (player.getSprite && player.getSprite() === sprite) {
                return player;
            }
        }

        console.warn('❌ Could not find player instance for sprite');
        return null;
    }
}