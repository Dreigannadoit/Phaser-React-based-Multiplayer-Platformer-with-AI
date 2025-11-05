import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import Phaser from 'phaser'
import PlatformerScene from './PlatformerScene'
import QuizPopup from '../Quiz/QuizPopup'
import MultiplayerManager from './MultiplayerManager'
import './Game.css'

const Game = () => {
    const { roomId } = useParams()
    const gameRef = useRef(null)
    const [quizData, setQuizData] = useState(null)
    const [multiplayerManager, setMultiplayerManager] = useState(null)

    useEffect(() => {
        // Initialize multiplayer manager
        const manager = new MultiplayerManager(roomId)
        setMultiplayerManager(manager)

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
            scene: [PlatformerScene],
            render: {
                antialias: false,
                pixelArt: true
            },
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
                width: '100%',
                height: '100%'
            }
        }

        const game = new Phaser.Game(config)

        // Listen for quiz events from Phaser
        const handleShowQuiz = (event) => {
            setQuizData(event.detail)
        }

        window.addEventListener('showQuiz', handleShowQuiz)

        return () => {
            window.removeEventListener('showQuiz', handleShowQuiz)
            game.destroy(true)
            manager.cleanup()
        }
    }, [roomId])

    const handleQuizAnswer = (isCorrect) => {
        // Send answer back to Phaser
        if (window.quizManager) {
            window.quizManager.handleQuizAnswer(isCorrect)
        }
        
        // Send result to multiplayer manager
        if (multiplayerManager) {
            multiplayerManager.sendQuizResult(isCorrect)
        }
        
        setQuizData(null)
    }

    const gameWrapperStyle = {
        width: '100vw',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a'
    }

    const gameContainerStyle = {
        width: '90vw',
        height: '90vh',
        maxWidth: '1600px',
        maxHeight: '1200px',
        border: '3px solid #333',
        borderRadius: '10px',
        boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden'
    }

    return (
        <div className="game-wrapper" style={gameWrapperStyle}>
            <div 
                id="game-container" 
                ref={gameRef} 
                style={gameContainerStyle}
            ></div>
            <QuizPopup
                isVisible={!!quizData}
                question={quizData?.question}
                options={quizData?.options}
                correctIndex={quizData?.correctIndex}
                onAnswer={handleQuizAnswer}
            />
        </div>
    )
}

export default Game