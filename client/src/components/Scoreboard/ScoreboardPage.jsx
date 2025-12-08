import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSocket } from '../../context/SocketContext'

const ScoreboardPage = () => {
    const { roomId } = useParams()
    const navigate = useNavigate()
    const { socket } = useSocket()
    const [finalScores, setFinalScores] = useState([])
    const [loading, setLoading] = useState(true)
    const [playerName, setPlayerName] = useState('')

    useEffect(() => {
        // Get player data from localStorage
        const storedData = JSON.parse(localStorage.getItem('playerData') || '{}')
        setPlayerName(storedData.playerName || 'Player')

        // Fetch final scores from server
        const fetchFinalScores = async () => {
            try {
                const response = await fetch(`http://localhost:3001/api/room/${roomId}/final-scores`)
                const data = await response.json()

                if (data.success) {
                    setFinalScores(data.scores)
                } else {
                    // If no final scores, try to get current scoreboard
                    if (socket) {
                        socket.emit('request-scoreboard')
                        socket.once('scoreboard-update', (players) => {
                            setFinalScores(players)
                        })
                    }
                }
            } catch (error) {
                console.error('Error fetching final scores:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchFinalScores()

        // Clean up socket listener
        return () => {
            if (socket) {
                socket.off('scoreboard-update')
            }
        }
    }, [roomId, socket])

    const handlePlayAgain = () => {
        // Reset the game
        if (socket) {
            socket.emit('reset-game', { roomId })
        }
        navigate(`/game/${roomId}`)
    }

    const handleBackToLobby = () => {
        navigate(`/room/${roomId}`)
    }

    const getMedalColor = (rank) => {
        switch (rank) {
            case 1: return '#FFD700' 
            case 2: return '#C0C0C0'
            case 3: return '#CD7F32'
            default: return 'transparent'
        }
    }

    const getRankText = (rank) => {
        switch (rank) {
            case 1: return '1st'
            case 2: return '2nd'
            case 3: return '3rd'
            default: return `${rank}th`
        }
    }

    if (loading) {
        return (
            <div className="scoreboard-page loading">
                <div className="loading-spinner"></div>
                <p>Loading final scores...</p>
            </div>
        )
    }

    return (
        <div className="scoreboard-page">
            <div className="scoreboard-container">
                <div className="scoreboard-header">
                    <h1>Game Over</h1>
                    <p className="subtitle">Final Scoreboard</p>
                    <div className="timer-ended">
                        Time's up! The game has ended.
                    </div>
                </div>

                <div className="podium-container">
                    {finalScores.slice(0, 3).map((player, index) => (
                        <div
                            key={player.id}
                            className={`podium-place podium-${index + 1}`}
                            style={{ border: getMedalColor(index + 1) }}
                        >
                            <div className="podium-rank">{index + 1}</div>
                            <div className="podium-name">{player.name}</div>
                            <div className="podium-score">{player.coins} coins</div>
                        </div>
                    ))}
                </div>

                <div className="full-scoreboard">
                    <h2>Final Rankings</h2>
                    <div className="scoreboard-list">
                        {finalScores.map((player, index) => (
                            <div
                                key={player.id}
                                className={`scoreboard-item ${player.name === playerName ? 'current-player' : ''}`}
                            >
                                <div className="rank-column">
                                    <span className="rank-number">{getRankText(index + 1)}</span>
                                    {index < 3 && (
                                        <div
                                            className="medal-circle"
                                            style={{ backgroundColor: getMedalColor(index + 1) }}
                                        />
                                    )}
                                </div>
                                <div className="name-column">
                                    {player.name}
                                    {player.name === playerName && <span className="you-badge">YOU</span>}
                                </div>
                                <div className="score-column">
                                    <span className="score-value">{player.coins}</span>
                                    <span className="score-label">coins</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="action-buttons">
                    <button className="btn play-again" onClick={handlePlayAgain}>
                        Play Again
                    </button>
                    <button className="btn back-to-lobby" onClick={handleBackToLobby}>
                        Back to Lobby
                    </button>
                </div>

                <div className="game-summary">
                    <p>Total Players: {finalScores.length}</p>
                    <p>Highest Score: {finalScores[0]?.coins || 0} coins</p>
                </div>
            </div>
        </div>
    )
}

export default ScoreboardPage