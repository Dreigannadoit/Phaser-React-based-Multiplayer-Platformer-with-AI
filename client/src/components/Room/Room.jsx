import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useSocket } from '../../context/SocketContext'
import RouteMusic from '../MusicPlayer/RouteMusic'

const Room = () => {
    const { roomId } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const [players, setPlayers] = useState([])
    const [isHost, setIsHost] = useState(false)
    const [playerName, setPlayerName] = useState('')
    const [error, setError] = useState('')
    const [isSpectator, setIsSpectator] = useState(false);

    const { socket, isConnected } = useSocket()
    const [gameQuestions, setGameQuestions] = useState([]);
    const [hasEnoughQuestions, setHasEnoughQuestions] = useState(false);
    const [serverQuestions, setServerQuestions] = useState([]);

    useEffect(() => {
        // const storedData = JSON.parse(localStorage.getItem('playerData') || '{}');
        // if (storedData.roomId) {
        //     console.log('🧹 Found previous session data, clearing...');
        //     localStorage.removeItem('playerData');
        //     localStorage.removeItem('gameState');
        //     localStorage.removeItem('playerProgress');
        // }


        localStorage.removeItem('gameState');
        localStorage.removeItem('playerProgress');


        if (socket && isConnected) {
            const pendingSync = JSON.parse(localStorage.getItem('pendingQuestionSync') || '[]');
            const roomPending = pendingSync.find(p => p.roomId === roomId);

            if (roomPending) {
                console.log(`🔄 Found pending questions to sync for room ${roomId}`);
                socket.emit('save-questions', {
                    roomId: roomId,
                    questions: roomPending.questions,
                    timestamp: roomPending.timestamp
                });

                // Remove from pending
                const newPending = pendingSync.filter(p => p.roomId !== roomId);
                localStorage.setItem('pendingQuestionSync', JSON.stringify(newPending));
            }
        }

        // Load questions from localStorage on component mount
        const loadQuestions = () => {
            try {
                const roomQuestionsKey = `gameQuestions_${roomId}`;
                const storedQuestions = localStorage.getItem(roomQuestionsKey);

                if (storedQuestions) {
                    const questions = JSON.parse(storedQuestions);
                    setGameQuestions(questions);
                    setHasEnoughQuestions(questions.length >= 5);
                    console.log(`📚 Loaded ${questions.length} questions for room ${roomId} from localStorage`);
                } else {
                    console.log(`📭 No questions found in localStorage for room ${roomId}`);
                }
            } catch (error) {
                console.error('Error loading questions:', error);
            }
        };

        loadQuestions();

        if (location.state?.questionsGenerated) {
            alert(`Successfully generated ${location.state.questionCount} questions!`);
            loadQuestions();
        }

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

        // CRITICAL FIX: Load spectator preference from localStorage
        const storedPlayerData = JSON.parse(localStorage.getItem('playerData') || '{}');

        // If we have stored data for this room, use it
        if (storedPlayerData.roomId === roomId) {
            // HOSTS: Use stored spectator preference
            // REGULAR PLAYERS: Always false (they can't be spectators)
            const shouldBeSpectator = host ?
                (storedPlayerData.isSpectator !== undefined ? storedPlayerData.isSpectator : true) :
                false;

            setIsSpectator(shouldBeSpectator);
            console.log('🎯 Loaded spectator preference from storage:', shouldBeSpectator, 'isHost:', host);
        } else {
            // CRITICAL FIX: For new players, ALWAYS default to player mode (false)
            // For new hosts, default to spectator mode (true)
            const defaultSpectator = host ? true : false;
            setIsSpectator(defaultSpectator);
            console.log('🎯 New player - default spectator:', defaultSpectator, 'isHost:', host);
        }

        const finalSpectatorStatus = host ? isSpectator : false;

        console.log(' Connecting to room...', {
            roomId,
            playerName: decodedName,
            isHost: host,
            isSpectator: finalSpectatorStatus
        })

        // Join room immediately with player info using shared socket
        socket.emit('join-game', {
            roomId,
            playerName: decodedName,
            isHost: host,
            isSpectator: finalSpectatorStatus
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
            console.log('Game starting...');
            localStorage.setItem('playerData', JSON.stringify({
                playerName: decodedName,
                isHost: host,
                roomId: roomId,
                isSpectator: isSpectator
            }));
            navigate(`/game/${roomId}`);
        });

        // Listen for navigation to game
        socket.on('navigate-to-game', (data) => {
            console.log('Navigating to game by server command');

            // CRITICAL FIX: Store player data WITH SPECTATOR STATUS
            localStorage.setItem('playerData', JSON.stringify({
                playerName: decodedName,
                isHost: host,
                roomId: roomId,
                isSpectator: isSpectator
            }));

            navigate(`/game/${roomId}`);
        });

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

        if (socket) {
            // Listen for question updates from server
            socket.on('questions-updated', (data) => {
                console.log(`🔄 Questions updated from server: ${data.count} questions`);

                if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
                    // Save to localStorage
                    const roomQuestionsKey = `gameQuestions_${roomId}`;
                    localStorage.setItem(roomQuestionsKey, JSON.stringify(data.questions));

                    // Update state
                    setGameQuestions(data.questions);
                    setHasEnoughQuestions(data.questions.length >= 5);

                    console.log(`💾 Saved ${data.questions.length} questions from server to localStorage`);
                }
            });

            socket.on('questions-received', (data) => {
                console.log(`📥 Received ${data.count} questions from server`);

                if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
                    // Save to localStorage
                    const roomQuestionsKey = `gameQuestions_${roomId}`;
                    localStorage.setItem(roomQuestionsKey, JSON.stringify(data.questions));

                    // Update state
                    setGameQuestions(data.questions);
                    setHasEnoughQuestions(data.questions.length >= 5);

                    console.log(`💾 Saved ${data.questions.length} questions to localStorage`);
                }
            });

            // Request questions from server on mount (for players)
            console.log(`📤 Requesting questions from server for room ${roomId}...`);
            socket.emit('request-questions', { roomId: roomId });
        }


        return () => {
            // Clean up event listeners but don't disconnect the socket
            if (socket) {
                socket.off('questions-updated');
                socket.off('questions-received');
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
            }
        }
    }, [socket, roomId, navigate, location.search, location.state, isSpectator])

    const navigateToPDFUpload = () => {
        navigate(`/pdf-upload/${roomId}`, {
            state: {
                roomId: roomId,
                playerName: playerName
            }
        });
    };
    const clearQuestions = () => {
        setGameQuestions([]);
        setHasEnoughQuestions(false);
        localStorage.removeItem('gameQuestions');
    };

    const handleStartGame = () => {
        if (!hasEnoughQuestions && isHost) {
            alert('Please add at least 5 questions before starting the game! Use the "Generate Questions from PDF" button.');
            return;
        }

        if (socket && isHost) {
            console.log('Starting game for room:', roomId);
            console.log('🎯 Host spectator mode:', isSpectator);

            // CRITICAL FIX: Store player data with spectator choice
            const playerDataToStore = {
                playerName: playerName,
                isHost: isHost,
                roomId: roomId,
                isSpectator: isSpectator // This should be false when "Player" is selected
            };
            localStorage.setItem('playerData', JSON.stringify(playerDataToStore));

            console.log('💾 Saved player data to localStorage:', playerDataToStore);

            // Clear any previous game state
            localStorage.removeItem('gameState');
            localStorage.removeItem('playerProgress');

            console.log(`🧹 Cleared previous game state for room: ${roomId}`);

            // Navigate host to game
            navigate(`/game/${roomId}`);

            // Tell server to start game with spectator info
            socket.emit('start-game', {
                roomId: roomId,
                hostIsSpectator: isSpectator
            });
        }
    };

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
        navigate('/home')
    }

    if (error) {
        return (
            <div className="room-container">
                <div className="room-content">
                    <div className="error-message">
                        <h2>Error</h2>
                        <p>{error}</p>
                        <button onClick={() => navigate('/home')} className="back-button">
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
            
            <RouteMusic musicType="room" />
            
            <div className="room-content">
                <div className="room-header">
                    <div>
                        <h1>Room: {roomId}</h1>
                        <p className="player-info">
                            {isHost ? '👑 Host' : '👤 Player'}: {playerName}
                            {currentPlayer && ` (ID: ${currentPlayer.id.substring(0, 8)}...)`}
                        </p>
                        <p className="room-status">
                            {players.length} player{players.length !== 1 ? 's' : ''} connected
                            {isHost && ` | Questions: ${gameQuestions.length}/5`}
                        </p>
                    </div>
                    <div className="header-actions">
                        {isHost ? (
                            <button onClick={copyHostLink} className="copy-button">
                                📋 Copy Host Link
                            </button>
                        ) : (
                            <button onClick={copyRoomLink} className="copy-button">
                                📋 Copy Player Link
                            </button>
                        )}
                        <button onClick={leaveRoom} className="leave-button">
                            🚪 Leave
                        </button>
                    </div>
                </div>

                {isHost && (
                    <div className="questions-section">
                        <div className="questions-header">
                            <h2>Game Questions</h2>
                            // Add to the questions-actions section in Room.jsx

                            <div className="questions-actions">
                                <button
                                    onClick={navigateToPDFUpload}
                                    className="pdf-button"
                                >
                                    📄 Generate Questions from PDF
                                </button>
                                {gameQuestions.length > 0 && (
                                    <>
                                        <button
                                            onClick={() => {
                                                if (socket) {
                                                    socket.emit('save-questions', {
                                                        roomId: roomId,
                                                        questions: gameQuestions
                                                    });
                                                    alert(`Synced ${gameQuestions.length} questions with players`);
                                                }
                                            }}
                                            className="sync-button"
                                            style={{ background: 'blue', color: 'white' }}
                                        >
                                            🔄 Sync with Players
                                        </button>
                                        <div className="questions-status">
                                            <span className="questions-count">
                                                ✅ {gameQuestions.length} questions ready
                                            </span>
                                            <button onClick={clearQuestions} className="clear-questions-button">
                                                🗑️ Clear
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Show server sync status */}
                        <div className="sync-status">
                            {serverQuestions.length > 0 && gameQuestions.length > 0 ? (
                                <span style={{ color: 'green' }}>✅ Questions synced with players</span>
                            ) : serverQuestions.length === 0 && gameQuestions.length > 0 ? (
                                <span style={{ color: 'orange' }}>⚠️ Questions not yet synced with players</span>
                            ) : null}
                        </div>

                        {gameQuestions.length > 0 ? (
                            <div className="questions-preview">
                                <h4>Sample Questions (Players will see these):</h4>
                                {gameQuestions.slice(0, 3).map((q, index) => (
                                    <div key={index} className="question-preview">
                                        <strong>Q{index + 1}:</strong> {q.question}
                                        <div className="options-preview">
                                            {q.options.map((opt, optIndex) => (
                                                <span
                                                    key={optIndex}
                                                    className={`option ${optIndex === q.correct ? 'correct' : ''}`}
                                                >
                                                    {String.fromCharCode(65 + optIndex)}. {opt}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {gameQuestions.length > 3 && (
                                    <p className="more-questions">
                                        ... and {gameQuestions.length - 3} more questions
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="no-questions">
                                <p>No questions added yet. Click "Generate Questions from PDF" to create questions from PDF files.</p>
                                <p><small>Players will automatically receive questions when they join.</small></p>
                            </div>
                        )}
                    </div>
                )}

                {/* Rest of the Room.jsx code remains the same */}
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
                                        {player.isHost ? '👑' : '👤'}
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
                                        {player.ready ? '✅ Ready' : '⏳ Waiting'}
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
                            disabled={players.length < 1 || !hasEnoughQuestions}
                            className={`start-button ${players.length < 1 || !hasEnoughQuestions ? 'disabled' : ''}`}
                        >
                            {!hasEnoughQuestions ? '❌ Need 5+ Questions' : `🎮 Start Game (${players.length} player${players.length !== 1 ? 's' : ''} ready)`}
                        </button>
                        <p className="host-instructions">
                            {!hasEnoughQuestions
                                ? 'You need at least 5 questions to start the game. Use the "Generate Questions from PDF" button above.'
                                : players.length < 2
                                    ? 'You can start the game with just yourself for testing, but 2+ players recommended for multiplayer.'
                                    : 'Ready to start the game! Players will be teleported to the game world.'}
                        </p>
                    </div>
                )}

                {isHost && (
                    <div className="spectator-choice-section">
                        <h3>Host Role Selection</h3>
                        <div className="role-selection">
                            <label className="role-option">
                                <input
                                    type="radio"
                                    name="host-role"
                                    value="spectator"
                                    checked={isSpectator}
                                    onChange={() => setIsSpectator(true)}
                                />
                                <span className="role-icon">👁️</span>
                                <span className="role-text">
                                    <strong>Spectator</strong>
                                    <small>Watch the game and monitor players</small>
                                </span>
                            </label>
                            <label className="role-option">
                                <input
                                    type="radio"
                                    name="host-role"
                                    value="player"
                                    checked={!isSpectator}
                                    onChange={() => setIsSpectator(false)}
                                />
                                <span className="role-icon">🎮</span>
                                <span className="role-text">
                                    <strong>Player</strong>
                                    <small>Play the game with others</small>
                                </span>
                            </label>
                        </div>
                        <p className="role-help">
                            {isSpectator
                                ? "You will watch the game as a spectator with free camera control."
                                : "You will play the game alongside other players."}
                        </p>
                    </div>
                )}

                {!isHost && (
                    <div className="player-role-info">
                        <h3>🎮 Playing as Player</h3>
                        <p>You will control a character in the game world.</p>
                    </div>
                )}

                {!isHost && currentPlayer && (
                    <div className="player-waiting">
                        <h3>Joined as Player</h3>
                        <p>Waiting for host to start the game...</p>
                        <div className="player-ready">
                            <button onClick={handleReadyToggle} className="ready-button">
                                {currentPlayer.ready ? '✅ Ready!' : '🎯 Mark as Ready'}
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
                    Questions: {gameQuestions.length}<br />
                    Socket Connected: {socket?.connected ? 'Yes' : 'No'}
                </div>
            </div>
        </div>
    )
}

export default Room