// client/src/components/Game/CollisionManager.js
export class CollisionManager {
    constructor(scene) {
        this.scene = scene;
        this.mapManager = scene.mapManager;
    }

    setupPlayerCollisions(player) {
        if (!player || !player.getSprite) {
            console.warn('Player not ready for collisions');
            return;
        }

        const sprite = player.getSprite();
        if (!sprite) {
            console.warn('Player sprite not available');
            return;
        }

        console.log('🔄 Setting up player collisions...');

        // Clear any existing colliders
        this.scene.physics.world.colliders.destroy();

        // Set up ground collisions
        this.scene.physics.add.collider(sprite, this.mapManager.getCollisionObjects());

        // Set up coin collection with proper overlap
        const coins = this.mapManager.getCoins();
        console.log(`💰 Coins available for collision: ${coins.getLength()}`);
        
        this.scene.physics.add.overlap(sprite, coins, this.collectCoin.bind(this), this.checkCoinOverlap.bind(this), this);

        // Set up spike damage
        this.scene.physics.add.overlap(sprite, this.mapManager.getSpikes(), this.hitSpike.bind(this), null, this);

        console.log('✅ Collisions set up for player');
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
            
            // Update local coins immediately for better UX
            this.scene.coinsCollected++;
            console.log(`📈 Coins collected: ${this.scene.coinsCollected}`);
            
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
        this.scene.lives -= spike.damage;
        console.log(`💔 Hit spike! Lives: ${this.scene.lives}`);

        // Emit immediate state update
        this.scene.emitGameStateUpdate();

        if (this.scene.localPlayer) {
            this.scene.localPlayer.takeDamage();    
        }
        this.scene.cameras.main.shake(100, 0.01);

        // Check game over
        if (this.scene.lives <= 0) {
            this.scene.restartGame();
        }
    }
}