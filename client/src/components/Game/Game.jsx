// client/src/components/Game/Game.jsx
import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import Phaser from 'phaser'
import PlatformerScene from './PlatformerScene'
import QuizPopup from '../Quiz/QuizPopup'
import MultiplayerManager from './managers/MultiplayerManager'
import PlayerStats from './PlayerStats'
import { useSocket } from '../../context/SocketContext'
import Scoreboard from './Scoreboard'
import RespawnCountdown from './RespawnCountdown'
import SpectatorPanel from './SpectatorPanel'

const Game = () => {
    const { roomId } = useParams()
    const gameRef = useRef(null)
    const [quizData, setQuizData] = useState(null)
    const [multiplayerManager, setMultiplayerManager] = useState(null)
    const [showSpectatorPanel, setShowSpectatorPanel] = useState(false);
    const [playerData, setPlayerData] = useState({});
    const { socket } = useSocket()

    // Get player data including isSpectator
    useEffect(() => {
        const storedData = JSON.parse(localStorage.getItem('playerData') || '{}');
        setPlayerData(storedData);

        if (storedData.isHost && storedData.isSpectator) {
            setShowSpectatorPanel(true);
            console.log('🎯 Host is in spectator mode - showing spectator panel');
        } else {
            setShowSpectatorPanel(false); // Ensure regular players don't see it
        }
    }, [roomId, socket]);

    useEffect(() => {
        const storedData = JSON.parse(localStorage.getItem('playerData') || '{}');
        setPlayerData(storedData);

        // CRITICAL FIX: Only host spectators get the panel
        // Check both isHost AND isSpectator
        if (storedData.isHost && storedData.isSpectator) {
            setShowSpectatorPanel(true);
            console.log('🎯 Host is in spectator mode - showing spectator panel');
        } else {
            setShowSpectatorPanel(false);
            console.log('🎯 Regular player or host playing - hiding spectator panel');
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
                pixelArt: true,
                roundPixels: true
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

        // Initialize multiplayer manager AFTER game is created
        const manager = new MultiplayerManager(roomId || storedData.roomId, socket);
        setMultiplayerManager(manager);
        window.multiplayerManager = manager;

        // Initialize the manager if socket is available
        if (socket) {
            manager.setSocket(socket);
        }

        return () => {
            window.removeEventListener('showQuiz', handleShowQuiz);
            game.destroy(true);
            if (multiplayerManager) {
                multiplayerManager.cleanup();
            }
        };
    }, [roomId, socket]);

    useEffect(() => {
        // Load questions and pass to quiz manager
        const loadQuestions = () => {
            try {
                // Get roomId from params or stored data
                const currentRoomId = roomId || JSON.parse(localStorage.getItem('playerData') || '{}').roomId;

                if (currentRoomId) {
                    // Try room-specific questions first
                    const roomQuestionsKey = `gameQuestions_${currentRoomId}`;
                    const storedQuestions = localStorage.getItem(roomQuestionsKey) || localStorage.getItem('gameQuestions');

                    if (storedQuestions && window.quizManager) {
                        const questions = JSON.parse(storedQuestions);
                        window.quizManager.updateQuestions(questions);
                        // console.log(`🎯 Loaded ${questions.length} questions for room ${currentRoomId}`);
                    }
                }
            } catch (error) {
                console.error('Error loading questions into game:', error);
            }
        };

        // Wait for game to be ready
        setTimeout(loadQuestions, 1000);
    }, [roomId]);

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
        position: 'relative'
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

    // Check if player is a spectator
    const isSpectator = playerData.isHost && playerData.isSpectator;

    return (
        <div className="game-wrapper" style={gameWrapperStyle}>
            {/* Player Stats Component - Show for ALL players (non-spectators) */}
            {!isSpectator && <PlayerStats />}

            {/* Spectator Toggle Button - ONLY for host spectators */}
            {isSpectator && (
                <button
                    className="spectator-toggle-btn"
                    onClick={() => setShowSpectatorPanel(!showSpectatorPanel)}
                    style={{
                        position: 'fixed',
                        top: '20px',
                        right: '20px',
                        zIndex: 999,
                        background: 'var(--pixel-orange)',
                        border: '3px solid var(--pixel-dark)',
                        color: 'white',
                        padding: '10px 15px',
                        cursor: 'pointer',
                        fontFamily: 'VT323, monospace',
                        fontSize: '1.2rem',
                        boxShadow: '3px 3px 0 var(--pixel-dark)'
                    }}
                >
                    {showSpectatorPanel ? '👁️ Hide Panel' : '👁️ Show Panel'}
                </button>
            )}

            {/* Spectator Panel - ONLY for host spectators */}
            <SpectatorPanel
                isVisible={showSpectatorPanel && isSpectator}
                onToggle={() => setShowSpectatorPanel(false)}
            />

            {/* Scoreboard Component - Show for everyone */}
            <Scoreboard />

            <RespawnCountdown />

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