import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const Home = () => {
    const [roomId, setRoomId] = useState('')
    const [playerName, setPlayerName] = useState('')
    const [showNameInput, setShowNameInput] = useState(false)
    const [actionType, setActionType] = useState('') // 'host' or 'join'
    const navigate = useNavigate()

    const generateRoomId = () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase()
    }

    const handleHostGame = () => {
        if (!playerName.trim()) {
            setActionType('host')
            setShowNameInput(true)
            return
        }

        const newRoomId = generateRoomId()
        // FIX: Navigate to ROOM first, not directly to game
        navigate(`/room/${newRoomId}?playerName=${encodeURIComponent(playerName)}&isHost=true`)
    }

    const handleJoinRoom = () => {
        if (!roomId.trim()) {
            alert('Please enter a room ID')
            return
        }

        if (!playerName.trim()) {
            setActionType('join')
            setShowNameInput(true)
            return
        }

        // FIXED: Use isHost=false for players
        navigate(`/room/${roomId.toUpperCase()}?isHost=false&playerName=${encodeURIComponent(playerName)}`)
    }

    const handleNameSubmit = () => {
        if (playerName.trim()) {
            if (actionType === 'host') {
                const newRoomId = generateRoomId()
                navigate(`/room/${newRoomId}?isHost=true&playerName=${encodeURIComponent(playerName)}`)
            } else {
                navigate(`/room/${roomId.toUpperCase()}?isHost=false&playerName=${encodeURIComponent(playerName)}`)
            }
        } else {
            alert('Please enter your name')
        }
    }

    const cancelNameInput = () => {
        setShowNameInput(false)
        setPlayerName('')
        setActionType('')
    }

    if (showNameInput) {
        return (
            <div className="home-container">
                <div className="home-content">
                    <h1 className="home-title">Enter Your Name</h1>
                    <p className="home-subtitle">
                        {actionType === 'host' ? 'You are hosting a new game' : `Joining room: ${roomId}`}
                    </p>

                    <div className="name-input-section">
                        <input
                            type="text"
                            placeholder="Enter your display name..."
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            className="name-input-full"
                            onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
                            autoFocus
                        />
                        <div className="name-actions">
                            <button onClick={cancelNameInput} className="cancel-button">
                                Cancel
                            </button>
                            <button onClick={handleNameSubmit} className="confirm-button">
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="home-container">
            <div className="home-content">
                <h1 className="home-title">🎮 Platformer Quiz Game</h1>
                <p className="home-subtitle">Host or join a multiplayer game session</p>

                <div className="home-actions">
                    <div className="join-section">
                        <label htmlFor="roomId" className="input-label">
                            Join Room through ID
                        </label>
                        <div className="input-group">
                            <input
                                id="roomId"
                                type="text"
                                placeholder="Enter room ID..."
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                className="room-input"
                                onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                            />
                            <button
                                onClick={handleJoinRoom}
                                className="join-button"
                            >
                                Join Room
                            </button>
                        </div>
                    </div>

                    <div className="divider">
                        <span>OR</span>
                    </div>

                    <button
                        onClick={handleHostGame}
                        className="host-button"
                    >
                        🎯 Host Game
                    </button>
                </div>

                <div className="home-info">
                    <h3>How it works:</h3>
                    <ul>
                        <li>🎯 <strong>Host</strong>: Create a room and wait for players to join</li>
                        <li>👥 <strong>Players</strong>: Join with room ID and play the game</li>
                        <li>👀 <strong>Host</strong>: Spectate and track player progress (cannot play)</li>
                        <li>💰 <strong>Players</strong>: Collect coins and answer quizzes</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default Home