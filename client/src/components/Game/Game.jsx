import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom' // ADD useNavigate
import Phaser from 'phaser'
import PlatformerScene from './PlatformerScene'
import QuizPopup from '../Quiz/QuizPopup'
import MultiplayerManager from './managers/MultiplayerManager'
import PlayerStats from './PlayerStats'
import { useSocket } from '../../context/SocketContext'
import Scoreboard from './Scoreboard'
import RespawnCountdown from './RespawnCountdown'
import SpectatorPanel from './SpectatorPanel'
import ExitGame from './ExitGame'

const Game = () => {
    const { roomId } = useParams()
    const navigate = useNavigate() 
    const gameRef = useRef(null)
    const [quizData, setQuizData] = useState(null)
    const [multiplayerManager, setMultiplayerManager] = useState(null)
    const [showSpectatorPanel, setShowSpectatorPanel] = useState(false)
    const [playerData, setPlayerData] = useState({})
    const { socket } = useSocket()
    
    const [timeLeft, setTimeLeft] = useState(180) 
    const [gameEnded, setGameEnded] = useState(false)

    // Get player data including isSpectator
    useEffect(() => {
        const storedData = JSON.parse(localStorage.getItem('playerData') || '{}')
        setPlayerData(storedData)

        const shouldShowPanel = storedData.isHost && storedData.isSpectator
        setShowSpectatorPanel(shouldShowPanel)

        console.log(`🎯 Game loaded - Host: ${storedData.isHost}, Spectator: ${storedData.isSpectator}, Show Panel: ${shouldShowPanel}`)
    }, [roomId, socket])

    // ADD: Game timer effect
    useEffect(() => {
        if (gameEnded) return

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    setGameEnded(true)
                    
                    // Emit game end to server
                    if (socket) {
                        socket.emit('game-ended', { roomId })
                    }
                    
                    // Redirect to scoreboard page
                    navigate(`/scoreboard/${roomId}`)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [gameEnded, roomId, socket, navigate])

    // ADD: Listen for game end from server
    useEffect(() => {
        if (!socket) return

        const handleGameEnded = () => {
            setGameEnded(true)
            navigate(`/scoreboard/${roomId}`)
        }

        socket.on('game-ended', handleGameEnded)

        return () => {
            socket.off('game-ended', handleGameEnded)
        }
    }, [socket, roomId, navigate])

    useEffect(() => {
        const storedData = JSON.parse(localStorage.getItem('playerData') || '{}')
        setPlayerData(storedData)

        if (storedData.isHost && storedData.isSpectator) {
            setShowSpectatorPanel(true)
            console.log('🎯 Host is in spectator mode - showing spectator panel')
        } else {
            setShowSpectatorPanel(false)
            console.log('🎯 Regular player or host playing - hiding spectator panel')
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

        const game = new Phaser.Game(config)

        const handleShowQuiz = (event) => {
            setQuizData(event.detail)
        }

        window.addEventListener('showQuiz', handleShowQuiz)

        // Initialize multiplayer manager AFTER game is created
        const manager = new MultiplayerManager(roomId || storedData.roomId, socket)
        setMultiplayerManager(manager)
        window.multiplayerManager = manager

        // Initialize the manager if socket is available
        if (socket) {
            manager.setSocket(socket)
        }

        return () => {
            window.removeEventListener('showQuiz', handleShowQuiz)
            game.destroy(true)
            if (multiplayerManager) {
                multiplayerManager.cleanup()
            }
        }
    }, [roomId, socket])

    // Rest of your existing useEffect for loading questions...
    
    const handleQuizAnswer = (isCorrect) => {
        if (window.quizManager) {
            window.quizManager.handleQuizAnswer(isCorrect)
        }

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
    const isSpectator = playerData.isHost && playerData.isSpectator

    // ADD: Format time display
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <div className="game-wrapper" style={gameWrapperStyle}>
            <ExitGame />
            
            <div style={{
                position: 'fixed',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                background: 'rgba(0, 0, 0, 0.8)',
                border: '3px solid #333',
                borderRadius: '8px',
                padding: '10px 20px',
                color: timeLeft <= 30 ? '#ff4444' : '#ffffff',
                fontSize: '24px',
                fontFamily: 'VT323, monospace',
                fontWeight: 'bold',
                textShadow: '2px 2px 0 #000',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.5)'
            }}>
                Time: {formatTime(timeLeft)}
            </div>

            {!isSpectator && <PlayerStats />}

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
                    {showSpectatorPanel ? 'Hide Panel' : 'Show Panel'}
                </button>
            )}

            <SpectatorPanel
                isVisible={showSpectatorPanel && isSpectator}
                onToggle={() => setShowSpectatorPanel(false)}
            />

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