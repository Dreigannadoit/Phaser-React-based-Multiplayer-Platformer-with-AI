export class Player {
    constructor(scene, x, y) {
        this.scene = scene;
        this.sprite = null;
        this.speed = 160;
        this.jumpForce = 280;
        this.cursors = null;
        this.wasdKeys = null;
        this.spaceKey = null;
        
        // Animation state
        this.isGrounded = false;
        this.isMoving = false;
        this.facingRight = true;
        
        // Coyote time variables
        this.coyoteTime = 0;
        this.coyoteTimeThreshold = 100; // 100ms coyote time
        this.wasGrounded = false;
        
        // Jump buffer variables
        this.jumpBuffer = 0;
        this.jumpBufferThreshold = 150; // 150ms jump buffer
        
        this.create(x, y);
    }

    create(x, y) {
        // Create player sprite using the first idle frame
        this.sprite = this.scene.physics.add.sprite(x, y, 'player_idle_1');
        this.sprite.setBounce(0.1); // Reduced from 0.2 to 0.1 for less bounciness
        this.sprite.setCollideWorldBounds(true);
        this.sprite.setSize(16, 16);
        
        // Set up input - both arrow keys and WASD
        this.cursors = this.scene.input.keyboard.createCursorKeys();
        
        // Set up WASD keys
        this.wasdKeys = this.scene.input.keyboard.addKeys('W,A,S,D');
        
        // Set up spacebar key
        this.spaceKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
        // Start with idle animation
        this.sprite.play('idle');
        
        return this.sprite;
    }

    destroy() {
        if (this.sprite) {
            this.sprite.destroy();
            this.sprite = null;
        }
    }

    update(time, delta) {
        // Only update if sprite exists
        if (!this.sprite) return;
        
        // Update grounded state
        this.wasGrounded = this.isGrounded;
        this.isGrounded = this.sprite.body.touching.down;
        
        // Update coyote time
        if (this.isGrounded) {
            this.coyoteTime = this.coyoteTimeThreshold;
        } else if (this.wasGrounded && !this.isGrounded) {
            // Just left the ground, start coyote time
            this.coyoteTime = this.coyoteTimeThreshold;
        } else {
            // In air, decrement coyote time
            this.coyoteTime = Math.max(0, this.coyoteTime - delta);
        }
        
        // Update jump buffer
        const jumpPressed = this.cursors.up.isDown || this.wasdKeys.W.isDown || this.spaceKey.isDown;
        if (jumpPressed) {
            this.jumpBuffer = this.jumpBufferThreshold;
        } else {
            this.jumpBuffer = Math.max(0, this.jumpBuffer - delta);
        }
        
        // Reset horizontal movement
        this.sprite.setVelocityX(0);
        
        // Horizontal movement - check both arrow keys and WASD
        const leftPressed = this.cursors.left.isDown || this.wasdKeys.A.isDown;
        const rightPressed = this.cursors.right.isDown || this.wasdKeys.D.isDown;
        
        this.isMoving = false;
        
        if (leftPressed) {
            this.sprite.setVelocityX(-this.speed);
            this.isMoving = true;
            this.facingRight = false;
        } else if (rightPressed) {
            this.sprite.setVelocityX(this.speed);
            this.isMoving = true;
            this.facingRight = true;
        }
        
        // Update sprite flip based on direction
        this.sprite.setFlipX(!this.facingRight);
        
        // Handle jumping with coyote time and jump buffering
        this.handleJump();
        
        // Update animations based on player state
        this.updateAnimations();
    }

    handleJump() {
        const canJump = this.isGrounded || this.coyoteTime > 0;
        let jumpCount = 2
        
        if (this.jumpBuffer > 0 && canJump) {
            this.sprite.setVelocityY(-this.jumpForce);
            this.jumpBuffer = 0; // Consume the jump buffer
            this.coyoteTime = 0; // Consume the coyote time
            jumpCount -= 1

        }
    }

    updateAnimations() {
        if (!this.sprite) return;
        
        // If player is in the air
        if (!this.isGrounded) {
            if (this.sprite.anims.currentAnim?.key !== 'jump') {
                this.sprite.play('jump', true);
            }
        }
        // If player is moving on ground
        else if (this.isMoving) {
            if (this.sprite.anims.currentAnim?.key !== 'run') {
                this.sprite.play('run', true);
            }
        }
        // Player is idle on ground
        else {
            if (this.sprite.anims.currentAnim?.key !== 'idle') {
                this.sprite.play('idle', true);
            }
        }
    }

    getSprite() {
        return this.sprite;
    }

    setTint(color) {
        if (this.sprite) {
            this.sprite.setTint(color);
        }
    }

    clearTint() {
        if (this.sprite) {
            this.sprite.clearTint();
        }
    }

    takeDamage() {
        // Only take damage if sprite exists
        if (!this.sprite) return;
        
        // Knockback effect
        this.sprite.setVelocityY(-200);
        this.setTint(0xff0000);
        
        // Reset tint after short time
        this.scene.time.delayedCall(200, () => {
            this.clearTint();
        });
    }
}