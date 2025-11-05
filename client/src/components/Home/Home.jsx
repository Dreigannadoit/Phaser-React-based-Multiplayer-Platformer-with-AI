import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const Home = () => {
    const [roomId, setRoomId] = useState('')
    const navigate = useNavigate()

    const generateRoomId = () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase()
    }

    const handleHostGame = () => {
        const newRoomId = generateRoomId()
        navigate(`/room/${newRoomId}`)
    }

    const handleJoinRoom = () => {
        if (roomId.trim()) {
            navigate(`/room/${roomId.trim().toUpperCase()}`)
        } else {
            alert('Please enter a room ID')
        }
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
                        <li>🏆 <strong>Host</strong>: Spectate and track player progress</li>
                        <li>💰 <strong>Players</strong>: Collect coins and answer quizzes</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default Home