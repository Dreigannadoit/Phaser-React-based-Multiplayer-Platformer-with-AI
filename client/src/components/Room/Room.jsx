import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import io from 'socket.io-client'

const Room = () => {
    const { roomId } = useParams()
    const navigate = useNavigate()
    const [socket, setSocket] = useState(null)
    const [players, setPlayers] = useState([])
    const [isHost, setIsHost] = useState(false)
    const [playerName, setPlayerName] = useState('')
    const [joined, setJoined] = useState(false)

    useEffect(() => {
        // Initialize socket connection
        const newSocket = io('http://localhost:3001') // Your backend server
        setSocket(newSocket)

        // Check if user is host (no player name entered yet)
        const urlParams = new URLSearchParams(window.location.search)
        const host = urlParams.get('host') === 'true'
        setIsHost(host)

        // Join room
        newSocket.emit('join-room', roomId, host ? 'HOST' : playerName)

        // Listen for player updates
        newSocket.on('players-updated', (playerList) => {
            setPlayers(playerList)
        })

        // Listen for game start
        newSocket.on('game-started', () => {
            navigate(`/game/${roomId}`)
        })

        return () => newSocket.close()
    }, [roomId, navigate])

    const handleJoinAsPlayer = () => {
        if (playerName.trim()) {
            socket.emit('join-room', roomId, playerName.trim())
            setJoined(true)
        }
    }

    const handleStartGame = () => {
        if (players.length >= 2) {
            socket.emit('start-game', roomId)
        } else {
            alert('Need at least 2 players to start the game!')
        }
    }

    const copyRoomLink = () => {
        const roomLink = `${window.location.origin}/room/${roomId}`
        navigator.clipboard.writeText(roomLink)
        alert('Room link copied to clipboard!')
    }

    return (
        <div className="room-container">
            <div className="room-content">
                <div className="room-header">
                    <h1>Room: {roomId}</h1>
                    <button onClick={copyRoomLink} className="copy-button">
                        📋 Copy Room Link
                    </button>
                </div>

                {!isHost && !joined && (
                    <div className="join-form">
                        <h2>Join as Player</h2>
                        <div className="name-input-group">
                            <input
                                type="text"
                                placeholder="Enter your name..."
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                className="name-input"
                                onKeyPress={(e) => e.key === 'Enter' && handleJoinAsPlayer()}
                            />
                            <button 
                                onClick={handleJoinAsPlayer}
                                className="join-room-button"
                            >
                                Join Game
                            </button>
                        </div>
                    </div>
                )}

                <div className="players-section">
                    <h2>Players in Room ({players.length})</h2>
                    <div className="players-list">
                        {players.map((player, index) => (
                            <div key={index} className="player-card">
                                <span className="player-avatar">
                                    {player.isHost ? '🎯' : '👤'}
                                </span>
                                <span className="player-name">
                                    {player.name} {player.isHost && '(Host)'}
                                </span>
                                <span className="player-status">
                                    {player.ready ? '✅ Ready' : '⏳ Waiting'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {isHost && (
                    <div className="host-controls">
                        <button 
                            onClick={handleStartGame}
                            disabled={players.length < 2}
                            className={`start-button ${players.length < 2 ? 'disabled' : ''}`}
                        >
                            🚀 Start Game ({players.length}/2+ players)
                        </button>
                        <p className="host-instructions">
                            As host, you'll spectate the game and track player progress.
                            Players will see their coins and scores in real-time.
                        </p>
                    </div>
                )}

                {!isHost && joined && (
                    <div className="waiting-message">
                        <h3>✅ Joined Successfully!</h3>
                        <p>Waiting for host to start the game...</p>
                        <div className="loading-spinner"></div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Room