// client/src/components/Game/Game.jsx
import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import Phaser from 'phaser'
import PlatformerScene from './PlatformerScene'
import QuizPopup from '../Quiz/QuizPopup'
import MultiplayerManager from './managers/MultiplayerManager'
import PlayerStats from './PlayerStats' // Import the new component
import { useSocket } from '../../context/SocketContext' // Import the socket context
import Scoreboard from './Scoreboard'

const Game = () => {
    const { roomId } = useParams()
    const gameRef = useRef(null)
    const [quizData, setQuizData] = useState(null)
    const [multiplayerManager, setMultiplayerManager] = useState(null)
    const { socket } = useSocket()

    useEffect(() => {
        // Get player data from localStorage
        const storedData = JSON.parse(localStorage.getItem('playerData') || '{}');
        const { playerName, isHost, roomId: storedRoomId } = storedData;

        console.log('🎮 Game component loading with stored data:', storedData);

        // Initialize multiplayer manager with the shared socket
        const manager = new MultiplayerManager(roomId || storedRoomId, socket);
        setMultiplayerManager(manager);
        window.multiplayerManager = manager;

        // Initialize the manager if socket is available
        if (socket) {
            manager.setSocket(socket);
        }

        const config = {
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

        const game = new Phaser.Game(config);

        const handleShowQuiz = (event) => {
            setQuizData(event.detail);
        }

        window.addEventListener('showQuiz', handleShowQuiz);

        return () => {
            window.removeEventListener('showQuiz', handleShowQuiz);
            game.destroy(true);
            if (multiplayerManager) {
                multiplayerManager.cleanup();
            }
        };
    }, [roomId, socket]); // Add socket to dependencies



    const handleQuizAnswer = (isCorrect) => {
        if (window.quizManager) {
            window.quizManager.handleQuizAnswer(isCorrect);
        }

        if (multiplayerManager) {
            multiplayerManager.sendQuizResult(isCorrect);
        }

        setQuizData(null);
    }

    const gameWrapperStyle = {
        width: '100vw',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        position: 'relative' // Important for positioning PlayerStats
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
            {/* Player Stats Component */}
            <PlayerStats />

            {/* Scoreboard Component */}
            <Scoreboard />

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