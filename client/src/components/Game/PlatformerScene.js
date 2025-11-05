import Phaser from "phaser";
import { MapManager } from "./MapManager";
import { Player } from "./Player";
import { QuizManager } from "./QuizManager";

export default class PlatformerScene extends Phaser.Scene {
    constructor() {
        super({ key: "PlatformerScene" });

        this.mapManager = null;
        this.player = null;
        this.hudContainer = null;
        this.livesText = null;
        this.coinsText = null;

        // Game state
        this.score = 0;
        this.lives = 3;
        this.coinsCollected = 0;

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

        // Create placeholder textures
        this.createTextures();

        // Load parallax background layers
        this.loadParallaxBackgrounds();

        // Initialize and load quiz manager
        this.quizManager = new QuizManager(this);
        this.quizManager.preload();
    }

    loadParallaxBackgrounds() {
        // Load background layers - you can replace these with your own assets
        this.load.image("parallax_background_1", "src/assets/background_1.png");
        this.load.image("parallax_background_2", "src/assets/background_2.png");

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
        // Load idle animation frames
        this.load.image(
            "player_idle_1",
            "src/assets/sprites/player/idle/player_idle_1.png"
        );
        this.load.image(
            "player_idle_2",
            "src/assets/sprites/player/idle/player_idle_2.png"
        );
        this.load.image(
            "player_idle_3",
            "src/assets/sprites/player/idle/player_idle_3.png"
        );
        this.load.image(
            "player_idle_4",
            "src/assets/sprites/player/idle/player_idle_4.png"
        );

        // Load run animation frames
        this.load.image(
            "player_run_1",
            "src/assets/sprites/player/run/player_run_1.png"
        );
        this.load.image(
            "player_run_2",
            "src/assets/sprites/player/run/player_run_2.png"
        );
        this.load.image(
            "player_run_3",
            "src/assets/sprites/player/run/player_run_3.png"
        );
        this.load.image(
            "player_run_4",
            "src/assets/sprites/player/run/player_run_4.png"
        );
        this.load.image(
            "player_run_5",
            "src/assets/sprites/player/run/player_run_5.png"
        );
        this.load.image(
            "player_run_6",
            "src/assets/sprites/player/run/player_run_6.png"
        );
        this.load.image(
            "player_run_7",
            "src/assets/sprites/player/run/player_run_7.png"
        );
        this.load.image(
            "player_run_8",
            "src/assets/sprites/player/run/player_run_8.png"
        );
        this.load.image(
            "player_run_9",
            "src/assets/sprites/player/run/player_run_9.png"
        );
        this.load.image(
            "player_run_10",
            "src/assets/sprites/player/run/player_run_10.png"
        );
        this.load.image(
            "player_run_11",
            "src/assets/sprites/player/run/player_run_11.png"
        );
        this.load.image(
            "player_run_12",
            "src/assets/sprites/player/run/player_run_12.png"
        );
        this.load.image(
            "player_run_13",
            "src/assets/sprites/player/run/player_run_13.png"
        );
        this.load.image(
            "player_run_14",
            "src/assets/sprites/player/run/player_run_14.png"
        );
        this.load.image(
            "player_run_15",
            "src/assets/sprites/player/run/player_run_15.png"
        );
        this.load.image(
            "player_run_16",
            "src/assets/sprites/player/run/player_run_16.png"
        );

        // Load jump animation frames
        this.load.image(
            "player_jump_1",
            "src/assets/sprites/player/jump/player_jump_1.png"
        );
        this.load.image(
            "player_jump_2",
            "src/assets/sprites/player/jump/player_jump_2.png"
        );
        this.load.image(
            "player_jump_3",
            "src/assets/sprites/player/jump/player_jump_3.png"
        );
        this.load.image(
            "player_jump_4",
            "src/assets/sprites/player/jump/player_jump_4.png"
        );
        this.load.image(
            "player_jump_5",
            "src/assets/sprites/player/jump/player_jump_5.png"
        );
        this.load.image(
            "player_jump_6",
            "src/assets/sprites/player/jump/player_jump_6.png"
        );
        this.load.image(
            "player_jump_7",
            "src/assets/sprites/player/jump/player_jump_7.png"
        );
        this.load.image(
            "player_jump_8",
            "src/assets/sprites/player/jump/player_jump_8.png"
        );
    }

    create() {
        // Reset game state when scene starts/restarts
        this.resetGameState();

        // Create parallax backgrounds first (so they're behind everything)
        this.createParallaxBackgrounds();

        // Create map and get map dimensions
        const mapDimensions = this.mapManager.create();

        // Create player
        this.player = new Player(this, 100, 200);

        // Create player animations
        this.createPlayerAnimations();

        // Set up camera
        this.cameras.main.setBounds(
            0,
            0,
            mapDimensions.width,
            mapDimensions.height
        );
        this.cameras.main.startFollow(this.player.getSprite());

        // Set camera zoom
        this.cameraZoom = this.normalZoom;
        this.cameras.main.setZoom(this.cameraZoom);

        // Smooth camera follow
        this.cameras.main.setLerp(0.1, 0.1);

        // Set up collisions
        this.setupCollisions();

        // Create HUD
        this.createHUD();

        // Create quiz UI

        window.quizManager = this.quizManager;
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
        if (!this.textures.exists("player")) {
            const playerGraphics = this.add.graphics();
            playerGraphics.fillStyle(0xff0000, 1);
            playerGraphics.fillRect(0, 0, 16, 16);
            playerGraphics.fillStyle(0x000000, 1);
            playerGraphics.fillRect(4, 4, 2, 2);
            playerGraphics.fillRect(10, 4, 2, 2);
            playerGraphics.fillRect(6, 8, 4, 2);
            playerGraphics.generateTexture("player", 16, 16);
            playerGraphics.destroy();
            this.textures.get("player").setFilter(Phaser.Textures.FilterMode.NEAREST);
        }

        if (!this.textures.exists("coin")) {
            const coinGraphics = this.add.graphics();
            coinGraphics.fillStyle(0xffff00, 1);
            coinGraphics.fillRect(4, 4, 8, 8);
            coinGraphics.fillStyle(0xffaa00, 1);
            coinGraphics.fillRect(6, 6, 4, 4);
            coinGraphics.generateTexture("coin", 16, 16);
            coinGraphics.destroy();
            this.textures.get("coin").setFilter(Phaser.Textures.FilterMode.NEAREST);
        }

        if (!this.textures.exists("spike")) {
            const spikeGraphics = this.add.graphics();
            spikeGraphics.fillStyle(0xff0000, 1);
            for (let y = 0; y < 4; y++) {
                const width = 4 - y;
                spikeGraphics.fillRect(width * 4, y * 4, 8 - width * 2, 4);
            }
            spikeGraphics.generateTexture("spike", 16, 16);
            spikeGraphics.destroy();
            this.textures.get("spike").setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
    }

    setupCollisions() {
        // Set up collisions with map objects
        this.physics.add.collider(
            this.player.getSprite(),
            this.mapManager.getCollisionObjects()
        );
        this.physics.add.overlap(
            this.player.getSprite(),
            this.mapManager.getCoins(),
            this.collectCoin,
            null,
            this
        );
        this.physics.add.overlap(
            this.player.getSprite(),
            this.mapManager.getSpikes(),
            this.hitSpike,
            null,
            this
        );
    }

    createHUD() {
        console.log("Creating floating HUD above player...");

        // Create a container that will follow the player
        this.hudContainer = this.add.container(
            this.player.getSprite().x,
            this.player.getSprite().y - 50
        );

        // HUD style - make it very visible
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

        console.log("Floating HUD created above player");
    }

    update(time, delta) {
        // Don't update game logic if quiz is active
        if (this.quizManager.isQuizActive()) {
            return;
        }

        // Update player if it exists and is active
        if (this.player && this.player.getSprite() && this.player.getSprite().active) {
            this.player.update(time, delta);

            // Update HUD position to follow player
            if (this.hudContainer) {
                this.hudContainer.x = this.player.getSprite().x;
                this.hudContainer.y = this.player.getSprite().y - 50;
            }
        }

        // Update parallax backgrounds
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
