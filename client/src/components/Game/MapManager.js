export class MapManager {
    constructor(scene) {
        this.scene = scene;
        this.groundLayer = null;
        this.collisionObjects = null;
        this.coins = null;
        this.spikes = null;

        // REMOVE scaling factor
        // this.SCALE_FACTOR = scene.SCALE_FACTOR || 2;
    }


    preload() {
        // Use correct paths for your new structure
        const mapsPath = '/assets/maps/';
        const spritesPath = '/assets/sprites/';

        this.scene.load.tilemapTiledJSON('map', `${mapsPath}map_2.json`);
        this.scene.load.image('tiles', `${spritesPath}world_tileset.png`);
    }

    create() {
        // Create tilemap
        const map = this.scene.make.tilemap({ key: 'map' });

        // Use the correct tileset name
        const tileset = map.addTilesetImage('tileset', 'tiles');

        // NO SCALING - remove setScale
        this.groundLayer = map.createLayer('Ground', tileset, 0, 0);
        // this.groundLayer.setScale(this.SCALE_FACTOR); // REMOVE THIS LINE

        // Set up physics - ORIGINAL map size
        const width = 60 * 16; // Original width
        const height = 30 * 16; // Original height
        this.scene.physics.world.setBounds(0, 0, width, height);

        // Create collision objects, coins, spikes - NO SCALING
        this.createCollisionObjects(map);
        this.createCoins(map);
        this.createSpikes(map);

        return {
            width: width,
            height: height
        };
    }


    createCollisionObjects(map) {
        this.collisionObjects = this.scene.physics.add.staticGroup();
        const solidLayer = map.getObjectLayer('solid');
        if (solidLayer && solidLayer.objects) {
            solidLayer.objects.forEach(obj => {
                if (obj.properties) {
                    const collidable = obj.properties.find(prop => prop.name === 'collidable' && prop.value);
                    if (collidable) {
                        const collider = this.collisionObjects.create(
                            obj.x + obj.width / 2, // NO SCALING
                            obj.y + obj.height / 2, // NO SCALING
                            null
                        );
                        collider.setSize(
                            obj.width, // NO SCALING
                            obj.height // NO SCALING
                        );
                        collider.setVisible(false);
                    }
                }
            });
        }
    }

    createCoins(map) {
        this.coins = this.scene.physics.add.staticGroup();
        const entityLayer = map.getObjectLayer('entity');

        if (entityLayer && entityLayer.objects) {
            console.log(`🗺️ Found ${entityLayer.objects.length} entities in map`);
            let coinCount = 0;

            entityLayer.objects.forEach(obj => {
                if (obj.type === 'coin') {
                    const coin = this.coins.create(
                        obj.x + obj.width / 2,
                        obj.y + obj.height / 2,
                        'coin'
                    );

                    // CRITICAL: Set up physics body for coin
                    coin.setSize(16, 16);
                    coin.body.updateFromGameObject(); // Ensure physics body matches sprite

                    coin.scoreValue = 10;
                    coinCount++;

                    console.log(`🪙 Created coin ${coinCount} at (${obj.x}, ${obj.y})`);
                }
            });

            console.log(`✅ Created ${coinCount} coins total`);
        } else {
            console.warn('❌ No entity layer or objects found in map');
        }
    }

    createSpikes(map) {
        this.spikes = this.scene.physics.add.staticGroup();
        const entityLayer = map.getObjectLayer('entity');
        if (entityLayer && entityLayer.objects) {
            entityLayer.objects.forEach(obj => {
                if (obj.type === 'spikes') {
                    const spike = this.spikes.create(
                        obj.x + obj.width / 2, // NO SCALING
                        obj.y + obj.height / 2, // NO SCALING
                        'spike'
                    );
                    // spike.setScale(this.SCALE_FACTOR); // REMOVE THIS
                    spike.setSize(16, 8); // Original size
                    spike.body.setOffset(0, 8); // Original offset
                    spike.damage = 1;
                }
            });
        }
    }
    getCollisionObjects() {
        return this.collisionObjects;
    }

    getCoins() {
        return this.coins;
    }

    getSpikes() {
        return this.spikes;
    }
}