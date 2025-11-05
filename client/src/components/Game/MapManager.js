export class MapManager {
    constructor(scene) {
        this.scene = scene;
        this.groundLayer = null;
        this.collisionObjects = null;
        this.coins = null;
        this.spikes = null;
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
        
        // Create ground layer
        this.groundLayer = map.createLayer('Ground', tileset, 0, 0);
        
        // Set up physics - map is 60x30 tiles, each 16px
        this.scene.physics.world.setBounds(0, 0, 60 * 16, 30 * 16);
        
        // Create collision objects
        this.createCollisionObjects(map);
        
        // Create coins
        this.createCoins(map);
        
        // Create spikes
        this.createSpikes(map);
        
        return {
            width: 60 * 16,
            height: 30 * 16
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
                        const collider = this.collisionObjects.create(obj.x + obj.width / 2, obj.y + obj.height / 2, null);
                        collider.setSize(obj.width, obj.height);
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
            entityLayer.objects.forEach(obj => {
                if (obj.type === 'coin') {
                    const coin = this.coins.create(obj.x + obj.width / 2, obj.y + obj.height / 2, 'coin');
                    coin.setSize(16, 16);
                    coin.scoreValue = 10;
                }
            });
        }
    }

    createSpikes(map) {
        this.spikes = this.scene.physics.add.staticGroup();
        const entityLayer = map.getObjectLayer('entity');
        if (entityLayer && entityLayer.objects) {
            entityLayer.objects.forEach(obj => {
                if (obj.type === 'spikes') {
                    const spike = this.spikes.create(obj.x + obj.width / 2, obj.y + obj.height / 2, 'spike');
                    spike.setSize(16, 8);
                    spike.body.setOffset(0, 8);
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