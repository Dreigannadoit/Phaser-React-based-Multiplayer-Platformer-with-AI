import Phaser from "phaser";
import { MapManager } from "./MapManager";
import { Player } from "./Player";
import { MultiplayerPlayer } from "./MultiplayerPlayer";
import { QuizManager } from "./QuizManager";

export default class PlatformerScene extends Phaser.Scene {
    constructor() {
        super({ key: "PlatformerScene" });

        this.mapManager = null;
        this.localPlayer = null;
        this.otherPlayers = new Map(); // playerId -> MultiplayerPlayer
        this.hudContainer = null;
        this.livesText = null;
        this.coinsText = null;

        // Game state
        this.score = 0;
        this.lives = 3;
        this.coinsCollected = 0;

        // Multiplayer
        this.roomCoins = new Map(); // coinId -> coin sprite
        this.isMultiplayer = false;


        // Parallax backgrounds
        this.backgrounds = [];

        // Quiz system
        this.quizManager = null;
        this.currentCoin = null;

        // Camera settings
        this.normalZoom = 2.5;
        this.quizZoom = 2.0;
        this.cameraZoom = this.normalZoom;
    }

    preload() {
        // Load player animations
        this.loadPlayerAnimations();

        // Load map assets
        this.mapManager = new MapManager(this);
        this.mapManager.preload();

        // Create placeholder textures ONLY if they don't exist
        this.createTextures();

        // Load parallax background layers
        this.loadParallaxBackgrounds();

        // Initialize and load quiz manager
        this.quizManager = new QuizManager(this);
        this.quizManager.preload();
    }

    loadParallaxBackgrounds() {
        // Load background layers - you can replace these with your own assets
        this.load.image("parallax_background_1", "/assets/background_2.png");
        this.load.image("parallax_background_2", "/assets/background_3.png");

        // Fallback: create colored placeholder backgrounds if images don't exist
        if (!this.textures.exists("parallax_background_1")) {
            this.createParallaxPlaceholder("parallax_background_1", 0x1a237e); // Dark blue
        }
        if (!this.textures.exists("parallax_background_2")) {
            this.createParallaxPlaceholder("parallax_background_2", 0x283593); // Medium blue
        }
    }

    createParallaxPlaceholder(textureKey, color) {
        // Create a simple gradient-like background as placeholder
        const graphics = this.add.graphics();
        const width = 800; // Match game width
        const height = 600; // Match game height

        // Create gradient effect
        for (let y = 0; y < height; y += 2) {
            const alpha = 0.3 + (y / height) * 0.7;
            graphics.fillStyle(color, alpha);
            graphics.fillRect(0, y, width, 2);
        }

        // Add some stars for distant background
        if (color === 0x1a237e) {
            // Only for the farthest background
            graphics.fillStyle(0xffffff, 0.8);
            for (let i = 0; i < 50; i++) {
                const x = Phaser.Math.Between(0, width);
                const y = Phaser.Math.Between(0, height);
                const size = Phaser.Math.FloatBetween(0.5, 2);
                graphics.fillRect(x, y, size, size);
            }
        }

        graphics.generateTexture(textureKey, width, height);
        graphics.destroy();
    }

    loadPlayerAnimations() {
        // Use absolute paths from the public folder or correct relative paths
        const basePath = '/assets/sprites/player/';

        // Load idle animation frames
        this.load.image('player_idle_1', `${basePath}idle/player_idle_1.png`);
        this.load.image('player_idle_2', `${basePath}idle/player_idle_2.png`);
        this.load.image('player_idle_3', `${basePath}idle/player_idle_3.png`);
        this.load.image('player_idle_4', `${basePath}idle/player_idle_4.png`);

        // Load run animation frames
        this.load.image('player_run_1', `${basePath}run/player_run_1.png`);
        this.load.image('player_run_2', `${basePath}run/player_run_2.png`);
        this.load.image('player_run_3', `${basePath}run/player_run_3.png`);
        this.load.image('player_run_4', `${basePath}run/player_run_4.png`);
        this.load.image('player_run_5', `${basePath}run/player_run_5.png`);
        this.load.image('player_run_6', `${basePath}run/player_run_6.png`);
        this.load.image('player_run_7', `${basePath}run/player_run_7.png`);
        this.load.image('player_run_8', `${basePath}run/player_run_8.png`);
        this.load.image('player_run_9', `${basePath}run/player_run_9.png`);
        this.load.image('player_run_10', `${basePath}run/player_run_10.png`);
        this.load.image('player_run_11', `${basePath}run/player_run_11.png`);
        this.load.image('player_run_12', `${basePath}run/player_run_12.png`);
        this.load.image('player_run_13', `${basePath}run/player_run_13.png`);
        this.load.image('player_run_14', `${basePath}run/player_run_14.png`);
        this.load.image('player_run_15', `${basePath}run/player_run_15.png`);
        this.load.image('player_run_16', `${basePath}run/player_run_16.png`);

        // Load jump animation frames
        this.load.image('player_jump_1', `${basePath}jump/player_jump_1.png`);
        this.load.image('player_jump_2', `${basePath}jump/player_jump_2.png`);
        this.load.image('player_jump_3', `${basePath}jump/player_jump_3.png`);
        this.load.image('player_jump_4', `${basePath}jump/player_jump_4.png`);
        this.load.image('player_jump_5', `${basePath}jump/player_jump_5.png`);
        this.load.image('player_jump_6', `${basePath}jump/player_jump_6.png`);
        this.load.image('player_jump_7', `${basePath}jump/player_jump_7.png`);
        this.load.image('player_jump_8', `${basePath}jump/player_jump_8.png`);
    }

    create() {
        // Reset game state
        this.resetGameState();

        // Create backgrounds
        this.createParallaxBackgrounds();

        // Create map
        const mapDimensions = this.mapManager.create();

        // Create player animations
        this.createPlayerAnimations();

        // Initialize multiplayer - but don't create player yet
        this.initializeMultiplayer();

        // Set up camera (will follow local player when created)
        this.cameras.main.setBounds(0, 0, mapDimensions.width, mapDimensions.height);
        this.cameras.main.setZoom(this.normalZoom);
        this.cameras.main.setLerp(0.1, 0.1);

        // Don't create HUD here - wait for player to be created
        // this.createHUD(); // Remove this line

        // Create quiz UI
        window.quizManager = this.quizManager;

        // Expose scene to window for multiplayer manager
        window.gameScene = this;

        console.log("PlatformerScene created, waiting for multiplayer connection...");
    }

    initializeMultiplayer() {
        // Wait for multiplayer manager to provide player data
        this.isMultiplayer = true;

        // The local player will be created when we receive game state from server
    }

    setupCollisions() {
        if (!this.localPlayer || !this.localPlayer.getSprite) {
            console.warn('Local player not ready for collisions');
            return;
        }

        const sprite = this.localPlayer.getSprite();
        if (!sprite) {
            console.warn('Player sprite not available');
            return;
        }

        // Clear any existing colliders
        this.physics.world.colliders.destroy();

        this.physics.add.collider(sprite, this.mapManager.getCollisionObjects());
        this.physics.add.overlap(sprite, this.mapManager.getCoins(), this.collectCoin, null, this);
        this.physics.add.overlap(sprite, this.mapManager.getSpikes(), this.hitSpike, null, this);

        console.log('Collisions set up for local player');
    }

    // Multiplayer methods
    updateOtherPlayer(data) {
        const { playerId, position, velocity, animation } = data;

        if (playerId === this.localPlayer?.playerData?.id) {
            return; // Don't update local player from network
        }

        let otherPlayer = this.otherPlayers.get(playerId);

        if (!otherPlayer) {
            // Create new remote player
            const playerData = {
                id: playerId,
                name: `Player${playerId.substring(0, 4)}`,
                position: position,
                velocity: velocity,
                animation: animation,
                color: 0x888888 // Default color
            };
            otherPlayer = new MultiplayerPlayer(this, playerData, false);
            this.otherPlayers.set(playerId, otherPlayer);
        } else {
            // Update existing remote player
            otherPlayer.update({
                ...otherPlayer.playerData,
                position,
                velocity,
                animation
            });
        }
    }

    updatePlayerCoins(data) {
        console.log(`Player ${data.playerName} now has ${data.coins} coins`);
        // You could update a scoreboard UI here
    }

    // In PlatformerScene.js - update the setLocalPlayer method
    setLocalPlayer(playerData) {
        console.log('🎯 Setting local player:', playerData);

        if (!playerData || !playerData.position) {
            console.error('❌ Invalid player data received:', playerData);
            playerData = {
                id: 'local-player',
                name: 'Player',
                position: { x: 100, y: 200 },
                velocity: { x: 0, y: 0 },
                animation: 'idle',
                color: 0xff6b6b
            };
        }

        // Create local player as MultiplayerPlayer first
        this.localPlayer = new MultiplayerPlayer(this, playerData, true);

        if (!this.localPlayer.getSprite()) {
            console.error('❌ Failed to create player sprite');
            return;
        }

        // Set up collisions for local player
        this.setupCollisions();

        // Make camera follow local player
        this.cameras.main.startFollow(this.localPlayer.getSprite());

        // Create HUD now that player exists
        this.createHUD();

        // Convert to controlled player for input handling
        this.convertToControlledPlayer();

        console.log('✅ Local player setup complete');
    }

    convertToControlledPlayer() {
        if (!this.localPlayer) return;

        // Replace the multiplayer player with a controlled player
        const sprite = this.localPlayer.getSprite();
        const playerData = this.localPlayer.playerData;

        this.localPlayer.destroy();

        // Create controlled player
        this.localPlayer = new Player(this, playerData.position.x, playerData.position.y);
        this.localPlayer.playerData = playerData;

        // Set up collisions again
        this.setupCollisions();

        // Make camera follow new player
        this.cameras.main.startFollow(this.localPlayer.getSprite());
    }

    createParallaxBackgrounds() {
        // Clear any existing backgrounds
        this.backgrounds.forEach((bg) => {
            if (bg.sprite) {
                bg.sprite.destroy();
            }
        });
        this.backgrounds = [];

        // Define parallax layers with their properties
        const layers = [
            {
                key: "parallax_background_1",
                speed: 0.1,
                scale: 1.0,
                alpha: 1.0,
                depth: -100,
            },
            {
                key: "parallax_background_2",
                speed: 0.3,
                scale: 1.0,
                alpha: 0.9,
                depth: -50,
            },
        ];

        const gameWidth = 800;
        const gameHeight = 600;

        layers.forEach((layer) => {
            // Use TileSprite for seamless scrolling backgrounds
            const bg = this.add.tileSprite(0, 0, gameWidth, gameHeight, layer.key);
            bg.setOrigin(0, 0);
            bg.setScrollFactor(0);
            bg.setDepth(layer.depth);
            bg.setAlpha(layer.alpha);

            this.backgrounds.push({
                sprite: bg,
                speed: layer.speed,
            });
        });
    }

    createPlayerAnimations() {
        // Create idle animation
        this.anims.create({
            key: "idle",
            frames: [
                { key: "player_idle_1" },
                { key: "player_idle_2" },
                { key: "player_idle_3" },
                { key: "player_idle_4" },
            ],
            frameRate: 5,
            repeat: -1,
        });

        // Create run animation
        this.anims.create({
            key: "run",
            frames: [
                { key: "player_run_1" },
                { key: "player_run_2" },
                { key: "player_run_3" },
                { key: "player_run_4" },
                { key: "player_run_5" },
                { key: "player_run_6" },
                { key: "player_run_7" },
                { key: "player_run_8" },
                { key: "player_run_9" },
                { key: "player_run_10" },
                { key: "player_run_11" },
                { key: "player_run_12" },
                { key: "player_run_13" },
                { key: "player_run_14" },
                { key: "player_run_15" },
                { key: "player_run_16" },
            ],
            frameRate: 10,
            repeat: -1,
        });

        // Create jump animation
        this.anims.create({
            key: "jump",
            frames: [
                { key: "player_jump_1" },
                { key: "player_jump_2" },
                { key: "player_jump_3" },
                { key: "player_jump_4" },
                { key: "player_jump_5" },
                { key: "player_jump_6" },
                { key: "player_jump_7" },
                { key: "player_jump_8" },
            ],
            frameRate: 10,
            repeat: 0,
        });
    }

    resetGameState() {
        // Reset game state variables
        this.score = 0;
        this.lives = 3;
        this.coinsCollected = 0;

        // Clear any existing objects
        if (this.player) {
            this.player.getSprite().destroy();
            this.player = null;
        }

        if (this.hudContainer) {
            this.hudContainer.destroy();
            this.hudContainer = null;
        }

        // Clear backgrounds - FIXED: use sprite property instead of sprites
        this.backgrounds.forEach((background) => {
            if (background.sprite) {
                background.sprite.destroy();
            }
        });
        this.backgrounds = [];

        // Reset map manager
        if (this.mapManager) {
            // The map manager will recreate objects in its create() method
        }
    }

    createTextures() {
        // Only create textures if they don't exist
        const textures = this.textures;

        if (!textures.exists("player")) {
            const playerGraphics = this.add.graphics();
            playerGraphics.fillStyle(0xff0000, 1);
            playerGraphics.fillRect(0, 0, 16, 16);
            playerGraphics.generateTexture("player", 16, 16);
            playerGraphics.destroy();
        }

        if (!textures.exists("coin")) {
            const coinGraphics = this.add.graphics();
            coinGraphics.fillStyle(0xffff00, 1);
            coinGraphics.fillCircle(8, 8, 6);
            coinGraphics.generateTexture("coin", 16, 16);
            coinGraphics.destroy();
        }

        if (!textures.exists("spike")) {
            const spikeGraphics = this.add.graphics();
            spikeGraphics.fillStyle(0xff0000, 1);
            spikeGraphics.fillTriangle(0, 16, 8, 0, 16, 16);
            spikeGraphics.generateTexture("spike", 16, 16);
            spikeGraphics.destroy();
        }
    }

    setupCollisions() {
        if (!this.localPlayer) {
            console.warn('Local player not ready for collisions');
            return;
        }

        // Wait a frame to ensure sprite is created
        this.time.delayedCall(100, () => {
            if (!this.localPlayer || !this.localPlayer.getSprite) {
                console.warn('Local player sprite method not available');
                return;
            }

            const sprite = this.localPlayer.getSprite();
            if (!sprite || !sprite.body) {
                console.warn('Player sprite or physics body not available');
                return;
            }

            // Clear any existing colliders
            if (this.physics.world.colliders) {
                this.physics.world.colliders.destroy();
            }

            this.physics.add.collider(sprite, this.mapManager.getCollisionObjects());
            this.physics.add.overlap(sprite, this.mapManager.getCoins(), this.collectCoin, null, this);
            this.physics.add.overlap(sprite, this.mapManager.getSpikes(), this.hitSpike, null, this);

            console.log('Collisions set up for local player');
        });
    }

    createHUD() {
        console.log("Creating floating HUD...");

        // Don't create HUD if player doesn't exist yet
        if (!this.localPlayer || !this.localPlayer.getSprite) {
            console.warn("Player not ready for HUD creation, will create later");
            // Try again in a moment
            this.time.delayedCall(500, () => this.createHUD());
            return;
        }

        try {
            const playerSprite = this.localPlayer.getSprite();
            if (!playerSprite) {
                console.warn("Player sprite not available for HUD");
                return;
            }

            // Create a container that will follow the player
            this.hudContainer = this.add.container(
                playerSprite.x,
                playerSprite.y - 50
            );

            // HUD style
            const style = {
                fontSize: "12px",
                fill: "#FFFFFF",
                fontFamily: "Arial, sans-serif",
                stroke: "#000000",
                strokeThickness: 3,
                backgroundColor: "#000000AA",
                padding: { left: 8, right: 8, top: 4, bottom: 4 },
            };

            // Create HUD text elements
            this.livesText = this.add.text(0, 0, "LIVES: 3", style);
            this.coinsText = this.add.text(0, 20, "COINS: 0", style);

            // Center the text in the container
            this.livesText.setOrigin(0.5);
            this.coinsText.setOrigin(0.5);

            // Add text to container
            this.hudContainer.add([this.livesText, this.coinsText]);

            // Set high depth to ensure HUD is on top
            this.hudContainer.setDepth(1000);

            console.log("Floating HUD created successfully");
        } catch (error) {
            console.error("Error creating HUD:", error);
        }
    }

    update(time, delta) {
        // Don't update if quiz is active
        if (this.quizManager.isQuizActive()) {
            return;
        }

        // Update local player
        if (this.localPlayer && this.localPlayer.update) {
            this.localPlayer.update(time, delta);

            // Send player movement to server
            if (this.isMultiplayer && window.multiplayerManager) {
                const sprite = this.localPlayer.getSprite();
                window.multiplayerManager.sendPlayerMovement(
                    { x: sprite.x, y: sprite.y },
                    { x: sprite.body.velocity.x, y: sprite.body.velocity.y },
                    this.localPlayer.sprite.anims.currentAnim?.key || 'idle'
                );
            }

            // Update HUD position
            if (this.hudContainer) {
                this.hudContainer.x = this.localPlayer.getSprite().x;
                this.hudContainer.y = this.localPlayer.getSprite().y - 50;
            }
        }
        // Update other players (handled by network updates)
        this.updateParallaxBackgrounds();

        // Update HUD text
        if (this.livesText) {
            this.livesText.setText('LIVES: ' + this.lives);
            this.coinsText.setText('COINS: ' + this.coinsCollected);
        }

        // Check game over
        if (this.lives <= 0) {
            this.restartGame();
        }
    }

    updateParallaxBackgrounds() {
        const camera = this.cameras.main;
        const cameraX = camera.scrollX;

        this.backgrounds.forEach((background) => {
            // Update tile position for parallax effect
            background.sprite.tilePositionX = cameraX * background.speed;
        });
    }

    restartGame() {
        // Use scene restart instead of trying to manually reset
        this.scene.restart();
    }

    async collectCoin(player, coin) {
        if (!this.isMultiplayer) {
            // Single player logic
            await this.handleSinglePlayerCoin(coin);
            return;
        }

        // Multiplayer coin collection
        const coinId = this.findCoinId(coin);
        if (coinId && window.multiplayerManager) {
            // Notify server about coin collection
            window.multiplayerManager.sendCoinCollection(coinId);

            // Show quiz for this player only
            await this.handleMultiplayerCoin(coin);
        }
    }

    async handleMultiplayerCoin(coin) {
        // Store the coin reference
        this.currentCoin = coin;

        // Temporarily disable the coin but don't destroy it yet
        coin.disableBody(true, true);

        // Zoom out camera for quiz
        await this.zoomCameraForQuiz();

        // Show quiz and wait for result
        const isCorrect = await this.quizManager.showQuiz();

        // Process quiz result
        this.processQuizResult(isCorrect, coin);

        // Zoom camera back to normal
        await this.zoomCameraBackToNormal();
    }

    findCoinId(coin) {
        // Find the coin ID based on position (you might want to store this differently)
        for (let [coinId, coinSprite] of this.roomCoins) {
            if (coinSprite === coin) {
                return coinId;
            }
        }
        return null;
    }

    removePlayer(playerId) {
        const player = this.otherPlayers.get(playerId);
        if (player) {
            player.destroy();
            this.otherPlayers.delete(playerId);
        }
    }


    async zoomCameraForQuiz() {
        return new Promise((resolve) => {
            this.cameras.main.zoomTo(this.quizZoom, 500, "Power2");
            this.cameras.main.once("camerazoomcomplete", () => {
                resolve();
            });
        });
    }

    async zoomCameraBackToNormal() {
        return new Promise((resolve) => {
            this.cameras.main.zoomTo(this.normalZoom, 500, "Power2");
            this.cameras.main.once("camerazoomcomplete", () => {
                resolve();
            });
        });
    }

    processQuizResult(isCorrect, coin) {
        if (isCorrect) {
            // Correct answer - add coin
            this.coinsCollected++;
            this.score += coin.scoreValue;
        } else {
            // Incorrect answer - remove coin (minimum 0)
            this.coinsCollected = Math.max(0, this.coinsCollected - 1);
        }

        // Now destroy the coin
        if (coin && coin.active) {
            coin.destroy();
        }
    }

    hitSpike(player, spike) {
        this.lives -= spike.damage;
        this.player.takeDamage();
        this.cameras.main.shake(100, 0.01);
    }
}
