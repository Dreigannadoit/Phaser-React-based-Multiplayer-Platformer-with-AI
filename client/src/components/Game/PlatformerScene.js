// client/src/components/Game/PlatformerScene.js
import Phaser from "phaser";
import { MapManager } from "./MapManager";
import { Player } from "./Player";
import { MultiplayerPlayer } from "./MultiplayerPlayer";
import { QuizManager } from "./QuizManager";
import { CollisionManager } from "./CollisionManager";
import { PlayerManager } from "./PlayerManager";
import { NetworkManager } from "./NetworkManager";
import { UIManager } from "./UIManager";

export default class PlatformerScene extends Phaser.Scene {
    constructor() {
        super({ key: "PlatformerScene" });

        // Managers
        this.mapManager = null;
        this.collisionManager = null;
        this.playerManager = null;
        this.networkManager = null;
        this.uiManager = null;
        this.quizManager = null;

        // Game state
        this.score = 0;
        this.lives = 3;
        this.coinsCollected = 0;
        this.lastEmittedState = { lives: 3, coins: 0, playerName: 'Player' };

        // Multiplayer
        this.roomCoins = new Map();
        this.isMultiplayer = false;
        this.isPlayerReady = false;

        // Camera settings
        this.normalZoom = 2;
        this.quizZoom = 1.7;
        this.cameraZoom = this.normalZoom;

        // Backgrounds
        this.backgrounds = [];
        this.currentCoin = null;

        // NEW: Respawn system
        this.isRespawning = false;
        this.respawnTimer = 0;
        this.respawnTime = 10; // seconds
        this.respawnText = null;
        this.respawnCountdownText = null;
        this.deathEffect = null;
    }

    preload() {
        this.loadPlayerAnimations();
        this.createTextures();
        this.loadParallaxBackgrounds();

        // Initialize managers
        this.mapManager = new MapManager(this);
        this.quizManager = new QuizManager(this);

        this.mapManager.preload();
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

    create() {
        this.resetGameState();

        // Initialize managers
        this.collisionManager = new CollisionManager(this);
        this.playerManager = new PlayerManager(this);
        this.networkManager = new NetworkManager(this);
        this.uiManager = new UIManager(this);

        this.createParallaxBackgrounds();
        const mapDimensions = this.mapManager.create();
        this.createPlayerAnimations();
        this.initializeMultiplayer();

        // DEBUG: Check if coins were created
        console.log(`🔍 Map created with ${this.mapManager.getCoins().getLength()} coins`);

        // Set up camera
        this.cameras.main.setBounds(0, 0, mapDimensions.width, mapDimensions.height);
        this.cameras.main.setZoom(this.normalZoom);
        this.cameras.main.setLerp(0.1, 0.1);

        // Add debug key for testing
        this.input.keyboard.on('keydown-D', () => {
            console.log('🐛 DEBUG INFO:');
            console.log(`- Coins in scene: ${this.mapManager.getCoins().getLength()}`);
            console.log(`- Player position: (${this.playerManager.getLocalPlayer()?.getSprite()?.x}, ${this.playerManager.getLocalPlayer()?.getSprite()?.y})`);
            console.log(`- Coins collected: ${this.coinsCollected}`);
            console.log(`- Is multiplayer: ${this.isMultiplayer}`);
            console.log(`- Is respawning: ${this.isRespawning}`);
            console.log(`- Respawn timer: ${this.respawnTimer}`);
        });

        window.quizManager = this.quizManager;
        window.gameScene = this;
        console.log("PlatformerScene created, waiting for multiplayer connection...");
    }

    initializeMultiplayer() {
        this.isMultiplayer = true;
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

    update(time, delta) {
        if (this.quizManager.isQuizActive()) {
            return;
        }

        // Handle respawn countdown
        if (this.isRespawning) {
            this.updateRespawnTimer(delta);
            return; // Don't update game logic while respawning
        }

        // Emit game state to React component
        this.emitGameStateUpdate();

        // Update network and players
        this.networkManager.update(time, delta);
        this.playerManager.interpolateOtherPlayers(delta);

        // Update UI and backgrounds
        this.uiManager.updateHUD();
        this.uiManager.updateHUDPosition();
        this.updateParallaxBackgrounds();

        // NEW: Check for death and start respawn process
        if (this.lives <= 0 && !this.isRespawning) {
            this.handlePlayerDeath();
        }
    }

    handlePlayerDeath() {
        console.log('💀 Player died! Starting respawn process...');

        this.isRespawning = true;
        this.respawnTimer = this.respawnTime;

        // Disable player controls and hide player
        const localPlayer = this.playerManager.getLocalPlayer();
        if (localPlayer && localPlayer.getSprite()) {
            localPlayer.getSprite().setVisible(false);
            localPlayer.getSprite().body.enable = false; // Disable physics
        }

        // Create death effect
        this.createDeathEffect();

        // Create respawn UI
        this.createRespawnUI();

        // Stop camera from following player
        this.cameras.main.stopFollow();

        // Emit death state
        this.emitGameStateUpdate();
    }

    createDeathEffect() {
        const localPlayer = this.playerManager.getLocalPlayer();
        if (!localPlayer || !localPlayer.getSprite()) return;

        const playerX = localPlayer.getSprite().x;
        const playerY = localPlayer.getSprite().y;

        // Create explosion/particle effect
        this.deathEffect = this.add.particles(playerX, playerY, 'coin', {
            speed: { min: 50, max: 200 },
            scale: { start: 0.5, end: 0 },
            blendMode: 'ADD',
            lifespan: 1000,
            gravityY: 300,
            quantity: 10,
            emitting: false
        });

        // Emit particles once
        this.deathEffect.explode(10);

        // Screen shake for dramatic effect
        this.cameras.main.shake(500, 0.02);
    }

    createRespawnUI() {
        const centerX = this.cameras.main.worldView.x + this.cameras.main.width / 2;
        const centerY = this.cameras.main.worldView.y + this.cameras.main.height / 2;

        // Create respawn message
        this.respawnText = this.add.text(centerX, centerY - 30, 'You Died!', {
            fontSize: '32px',
            fill: '#ff0000',
            stroke: '#000000',
            strokeThickness: 4,
            fontFamily: 'Arial'
        });
        this.respawnText.setOrigin(0.5);
        this.respawnText.setScrollFactor(0);
        this.respawnText.setDepth(1000);

        // Create countdown text
        this.respawnCountdownText = this.add.text(centerX, centerY + 20, `Respawning in ${this.respawnTimer}...`, {
            fontSize: '24px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            fontFamily: 'Arial'
        });
        this.respawnCountdownText.setOrigin(0.5);
        this.respawnCountdownText.setScrollFactor(0);
        this.respawnCountdownText.setDepth(1000);
    }

    updateRespawnTimer(delta) {
        // Convert delta from milliseconds to seconds
        const deltaSeconds = delta / 1000;
        this.respawnTimer = Math.max(0, this.respawnTimer - deltaSeconds);

        // Update countdown text
        if (this.respawnCountdownText) {
            const secondsLeft = Math.ceil(this.respawnTimer);
            this.respawnCountdownText.setText(`Respawning in ${secondsLeft}...`);

            // Flash effect when getting close to respawn
            if (secondsLeft <= 3) {
                this.respawnCountdownText.setFill('#ffff00'); // Yellow for last 3 seconds
            }
        }

        // Check if respawn time is up
        if (this.respawnTimer <= 0) {
            this.respawnPlayer();
        }
    }

    respawnPlayer() {
        console.log('🔄 Respawning player...');

        // Clean up respawn UI
        if (this.respawnText) {
            this.respawnText.destroy();
            this.respawnText = null;
        }
        if (this.respawnCountdownText) {
            this.respawnCountdownText.destroy();
            this.respawnCountdownText = null;
        }

        // Clean up death effect
        if (this.deathEffect) {
            this.deathEffect.destroy();
            this.deathEffect = null;
        }

        // Reset lives and respawn state
        this.lives = 3;
        this.isRespawning = false;

        // Get respawn position (you might want to set specific spawn points)
        const spawnX = 100;
        const spawnY = 200;

        // Reset player position and state
        const localPlayer = this.playerManager.getLocalPlayer();
        if (localPlayer && localPlayer.getSprite()) {
            localPlayer.getSprite().setPosition(spawnX, spawnY);
            localPlayer.getSprite().setVisible(true);
            localPlayer.getSprite().body.enable = true; // Re-enable physics
            localPlayer.getSprite().setVelocity(0, 0); // Reset velocity

            // Reset any stun states
            if (localPlayer.isStunned) {
                localPlayer.isStunned = false;
                localPlayer.clearTint();
                localPlayer.getSprite().setAlpha(1);
            }
        }

        // Make camera follow player again
        this.cameras.main.startFollow(localPlayer.getSprite());

        // Reset coins (optional - if you want to respawn collected coins)
        // this.respawnCoins();

        console.log('✅ Player respawned!');

        // Emit state update
        this.emitGameStateUpdate();
    }

    respawnCoins() {
        const coins = this.mapManager.getCoins();
        coins.clear(true, true); // Clear existing coins

        // Recreate coins from map (you might need to call your coin creation method)
        // this.mapManager.createCoins(this.mapManager.map); // You'll need to adjust this based on your MapManager
    }

    emitGameStateUpdate() {
        const currentState = {
            lives: this.lives,
            coins: this.coinsCollected,
            playerName: this.playerManager.getLocalPlayer()?.playerData?.name || 'Player'
        };

        if (JSON.stringify(currentState) !== JSON.stringify(this.lastEmittedState)) {
            window.dispatchEvent(new CustomEvent('gameStateUpdate', {
                detail: currentState
            }));
            this.lastEmittedState = currentState;
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
        // NEW: Use respawn system instead of immediate restart
        if (this.lives <= 0 && !this.isRespawning) {
            this.handlePlayerDeath();
        }
    }
    // Quiz methods
    async handleSinglePlayerCoin(coin) {
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

    async handleMultiplayerCoin(coin) {
        // Emit quiz start event
        window.dispatchEvent(new CustomEvent('quizStarted'));

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

        // Emit quiz end event
        window.dispatchEvent(new CustomEvent('quizEnded'));
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

    resetGameState() {
        this.score = 0;
        this.lives = 3;
        this.coinsCollected = 0;

        // NEW: Reset respawn system
        this.isRespawning = false;
        this.respawnTimer = 0;

        // Clean up any existing respawn UI
        if (this.respawnText) {
            this.respawnText.destroy();
            this.respawnText = null;
        }
        if (this.respawnCountdownText) {
            this.respawnCountdownText.destroy();
            this.respawnCountdownText = null;
        }
        if (this.deathEffect) {
            this.deathEffect.destroy();
            this.deathEffect = null;
        }

        // Reset managers
        if (this.uiManager) {
            this.uiManager.destroy();
        }

        // Clear backgrounds
        this.backgrounds.forEach(background => {
            if (background.sprite) {
                background.sprite.destroy();
            }
        });
        this.backgrounds = [];

        // Reinitialize UI manager
        this.uiManager = new UIManager(this);
    }

    // Delegate methods to managers
    setLocalPlayer(playerData) {
        this.playerManager.setLocalPlayer(playerData);
    }

    updateOtherPlayer(data) {
        this.playerManager.updateOtherPlayer(data);
    }

    removePlayer(playerId) {
        this.playerManager.removePlayer(playerId);
    }

    handleGameStateSync(data) {
        this.networkManager.handleGameStateSync(data);
    }

    updatePlayerCoins(data) {
        console.log(`💰 Player ${data.playerName} now has ${data.coins} coins`);

        // If this is our local player, update the coins
        if (data.playerId === this.playerManager.getLocalPlayer()?.playerData?.id) {
            this.coinsCollected = data.coins;
        }
    }
}