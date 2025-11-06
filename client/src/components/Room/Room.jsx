import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useSocket } from '../../context/SocketContext' 

const Room = () => {
    const { roomId } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const [players, setPlayers] = useState([])
    const [isHost, setIsHost] = useState(false)
    const [playerName, setPlayerName] = useState('')
    const [error, setError] = useState('')
    const { socket } = useSocket() // Use shared socket

    useEffect(() => {
        if (!socket) {
            console.log(' Waiting for socket connection...')
            return
        }

        // Get player name and host status from URL parameters
        const searchParams = new URLSearchParams(location.search)
        const name = searchParams.get('playerName')
        const host = searchParams.get('isHost') === 'true'

        console.log('Room params:', { name, host, roomId })

        if (!name) {
            setError('Missing player name')
            return
        }

        const decodedName = decodeURIComponent(name)
        setPlayerName(decodedName)
        setIsHost(host)

        console.log(' Connecting to room...', { roomId, playerName: decodedName, isHost: host })

        // Join room immediately with player info using shared socket
        socket.emit('join-game', {
            roomId,
            playerName: decodedName,
            isHost: host
        })

        // Listen for player assignment
        socket.on('player-assigned', (data) => {
            console.log('Player assigned:', data)
            setIsHost(data.isHost)
        })

        // Listen for player updates
        socket.on('players-updated', (playerList) => {
            console.log('Players updated:', playerList)
            setPlayers(playerList)
        })

        // Listen for game state
        socket.on('game-state', (data) => {
            console.log('Game state received:', data)
            if (data.players) {
                setPlayers(data.players)
            }
        })

        // Listen for player joined events
        socket.on('player-joined', (player) => {
            console.log('Player joined:', player)
            setPlayers(prev => {
                const exists = prev.find(p => p.id === player.id)
                if (exists) return prev
                return [...prev, player]
            })
        })

        // Listen for player left events
        socket.on('player-left', (playerId) => {
            console.log('Player left:', playerId)
            setPlayers(prev => prev.filter(p => p.id !== playerId))
        })

        // Listen for game start
        socket.on('game-started', () => {
            console.log('Game starting...')
            // Store player data for the game
            localStorage.setItem('playerData', JSON.stringify({
                playerName: decodedName,
                isHost: host,
                roomId: roomId
            }))
            navigate(`/game/${roomId}`)
        })

        // Listen for navigation to game
        socket.on('navigate-to-game', (data) => {
            console.log('Navigating to game by server command')
            
            // Store player data for the game
            localStorage.setItem('playerData', JSON.stringify({
                playerName: decodedName,
                isHost: host,
                roomId: roomId
            }))
            
            navigate(`/game/${roomId}`)
        })

        // Listen for errors
        socket.on('join-error', (errorMsg) => {
            console.error('Join error:', errorMsg)
            setError(errorMsg)
        })

        // Connection events for debugging
        socket.on('connect', () => {
            console.log(' Connected to server in Room')
        })

        socket.on('disconnect', () => {
            console.log(' Disconnected from server in Room')
        })

        socket.on('connect_error', (error) => {
            console.error('Connection error:', error)
            setError('Failed to connect to server')
        })

        return () => {
            // Clean up event listeners but don't disconnect the socket
            if (socket) {
                socket.off('player-assigned')
                socket.off('players-updated')
                socket.off('game-state')
                socket.off('player-joined')
                socket.off('player-left')
                socket.off('game-started')
                socket.off('navigate-to-game')
                socket.off('join-error')
                socket.off('connect')
                socket.off('disconnect')
                socket.off('connect_error')
                
                // socket.emit('leave-game', roomId)
            }
        }
    }, [socket, roomId, navigate, location.search])

    const handleStartGame = () => {
        if (socket && isHost) {
            console.log('Starting game for room:', roomId)
            
            // Store player data for the game
            localStorage.setItem('playerData', JSON.stringify({
                playerName: playerName,
                isHost: isHost,
                roomId: roomId
            }))
            
            // Navigate host to game
            navigate(`/game/${roomId}`)
            
            // Tell server to start game
            socket.emit('start-game', roomId)
        }
    }

    const handleReadyToggle = () => {
        if (socket) {
            socket.emit('player-ready', roomId, true)
        }
    }

    const copyRoomLink = () => {
        const roomLink = `${window.location.origin}/room/${roomId}?playerName=${encodeURIComponent(playerName)}&isHost=false`
        navigator.clipboard.writeText(roomLink)
        alert('Room link copied to clipboard! Share this with other players.')
    }

    const copyHostLink = () => {
        const hostLink = `${window.location.origin}/room/${roomId}?playerName=${encodeURIComponent(playerName + ' (Host)')}&isHost=true`
        navigator.clipboard.writeText(hostLink)
        alert('Host link copied to clipboard! Use this to join as host.')
    }

    const leaveRoom = () => {
        if (socket) {
            socket.emit('leave-game', roomId)
        }
        navigate('/')
    }

    if (error) {
        return (
            <div className="room-container">
                <div className="room-content">
                    <div className="error-message">
                        <h2>Error</h2>
                        <p>{error}</p>
                        <button onClick={() => navigate('/')} className="back-button">
                            Return to Home
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const currentPlayer = players.find(p => p.id === socket?.id)

    return (
        <div className="room-container">
            <div className="room-content">
                <div className="room-header">
                    <div>
                        <h1>Room: {roomId}</h1>
                        <p className="player-info">
                            {isHost ? ' Host' : '👤 Player'}: {playerName}
                            {currentPlayer && ` (ID: ${currentPlayer.id.substring(0, 8)}...)`}
                        </p>
                        <p className="room-status">
                            {players.length} player{players.length !== 1 ? 's' : ''} connected
                        </p>
                    </div>
                    <div className="header-actions">
                        {isHost ? (
                            <button onClick={copyHostLink} className="copy-button">
                                 Copy Host Link
                            </button>
                        ) : (
                            <button onClick={copyRoomLink} className="copy-button">
                                 Copy Player Link
                            </button>
                        )}
                        <button onClick={leaveRoom} className="leave-button">
                             Leave
                        </button>
                    </div>
                </div>

                <div className="players-section">
                    <h2>Players in Room ({players.length})</h2>
                    {players.length === 0 ? (
                        <div className="no-players">
                            <p>No players connected yet. Share the room link to invite players!</p>
                        </div>
                    ) : (
                        <div className="players-list">
                            {players.map((player, index) => (
                                <div key={player.id} className={`player-card ${player.id === socket?.id ? 'current-player' : ''}`}>
                                    <span className="player-avatar">
                                        {player.isHost ? '' : ''}
                                    </span>
                                    <div className="player-info">
                                        <span className="player-name">
                                            {player.name}
                                            {player.isHost && ' (Host)'}
                                            {player.id === socket?.id && ' (You)'}
                                        </span>
                                        <span className="player-details">
                                            ID: {player.id.substring(0, 8)}... |
                                            Joined: {new Date(player.joinedAt).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <span className="player-status">
                                        {player.ready ? ' Ready' : ' Waiting'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {isHost && (
                    <div className="host-controls">
                        <button
                            onClick={handleStartGame}
                            disabled={players.length < 1}
                            className={`start-button ${players.length < 1 ? 'disabled' : ''}`}
                        >
                             Start Game ({players.length} player{players.length !== 1 ? 's' : ''} ready)
                        </button>
                        <p className="host-instructions">
                            {players.length < 2
                                ? 'You can start the game with just yourself for testing, but 2+ players recommended for multiplayer.'
                                : 'Ready to start the game! Players will be teleported to the game world.'}
                        </p>
                    </div>
                )}

                {!isHost && currentPlayer && (
                    <div className="player-waiting">
                        <h3>Joined as Player</h3>
                        <p>Waiting for host to start the game...</p>
                        <div className="player-ready">
                            <button onClick={handleReadyToggle} className="ready-button">
                                {currentPlayer.ready ? 'Ready!' : 'Mark as Ready'}
                            </button>
                        </div>
                        <div className="loading-spinner"></div>
                    </div>
                )}

                {!currentPlayer && (
                    <div className="joining-message">
                        <p>Joining room {roomId}...</p>
                        <div className="loading-spinner"></div>
                    </div>
                )}

                <div className="debug-info" style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '5px', fontSize: '12px' }}>
                    <strong>Debug Info:</strong><br />
                    Socket ID: {socket?.id || 'Disconnected'}<br />
                    Current Player: {currentPlayer ? 'Found' : 'Not found'}<br />
                    Players in state: {players.length}<br />
                    Is Host: {isHost ? 'Yes' : 'No'}<br />
                    Room ID: {roomId}<br />
                    Socket Connected: {socket?.connected ? 'Yes' : 'No'}
                </div>
            </div>
        </div>
    )
}

export default Room