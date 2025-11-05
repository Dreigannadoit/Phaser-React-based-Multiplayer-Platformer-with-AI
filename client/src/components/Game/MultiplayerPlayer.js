export class MultiplayerPlayer {
    constructor(scene, playerData, isLocalPlayer = false) {
        this.scene = scene;
        this.playerData = playerData;
        this.isLocalPlayer = isLocalPlayer;
        this.sprite = null;

        this.create();
    }

    // In MultiplayerPlayer.js - update the create method
    create() {
        console.log(`🎮 Creating player: ${this.playerData.name} at (${this.playerData.position.x}, ${this.playerData.position.y})`);

        // Check if scene and physics are available
        if (!this.scene || !this.scene.physics) {
            console.error('❌ Scene or physics not available');
            return null;
        }

        try {
            // Create player sprite - use a fallback texture if needed
            const textureKey = this.scene.textures.exists('player_idle_1') ? 'player_idle_1' : 'player';

            this.sprite = this.scene.physics.add.sprite(
                this.playerData.position.x || 100,
                this.playerData.position.y || 200,
                textureKey
            );

            if (!this.sprite) {
                console.error('❌ Failed to create player sprite');
                return null;
            }

            this.sprite.setBounce(0.1);
            this.sprite.setCollideWorldBounds(true);
            this.sprite.setSize(16, 16);

            // Set player color for identification
            if (this.playerData.color) {
                this.sprite.setTint(this.playerData.color);
            }

            // Add player name label
            this.nameText = this.scene.add.text(
                this.sprite.x,
                this.sprite.y - 20,
                this.playerData.name,
                {
                    fontSize: '8px',
                    fill: '#FFFFFF',
                    stroke: '#000000',
                    strokeThickness: 2
                }
            );
            this.nameText.setOrigin(0.5);
            this.nameText.setDepth(1000);

            // Start with idle animation if available
            if (this.isLocalPlayer && this.scene.anims.exists('idle')) {
                this.sprite.play('idle');
            }

            console.log(`✅ Player ${this.playerData.name} created successfully`);
            return this.sprite;
        } catch (error) {
            console.error('❌ Error creating multiplayer player:', error);
            return null;
        }
    }

    update(playerData) {
        if (!this.sprite || !this.sprite.active) return;

        this.playerData = playerData;

        if (!this.isLocalPlayer) {
            // Smooth interpolation for remote players
            this.scene.tweens.add({
                targets: this.sprite,
                x: playerData.position.x,
                y: playerData.position.y,
                duration: 100,
                ease: 'Power2'
            });

            // Update animation for remote players
            if (playerData.animation && this.sprite.anims.currentAnim?.key !== playerData.animation) {
                this.sprite.play(playerData.animation, true);
            }
        }

        // Update name position
        this.nameText.x = this.sprite.x;
        this.nameText.y = this.sprite.y - 20;
    }

    destroy() {
        if (this.sprite) {
            this.sprite.destroy();
        }
        if (this.nameText) {
            this.nameText.destroy();
        }
    }

    getSprite() {
        return this.sprite;
    }
}