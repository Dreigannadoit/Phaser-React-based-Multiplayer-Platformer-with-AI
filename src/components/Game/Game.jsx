import React, { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import PlatformerScene from './PlatformerScene'

const Game = () => {
    const gameRef = useRef(null)

    useEffect(() => {
        const config = {
            type: Phaser.AUTO,
            width: 800,
            height: 600,
            parent: 'game-container',
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { y: 400 },
                    debug: false
                }
            },
            scene: PlatformerScene,
            render: {
                antialias: false,
                pixelArt: true
            },
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH
            }
        }

        const game = new Phaser.Game(config)

        return () => {
            game.destroy(true)
        }
    }, [])

    return (
        <div className="game-wrapper">
            <div id="game-container" ref={gameRef}></div>
        </div>
    )
}

export default Game