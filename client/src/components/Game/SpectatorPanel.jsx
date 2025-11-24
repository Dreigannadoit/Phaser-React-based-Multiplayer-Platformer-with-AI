import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';

const SpectatorPanel = ({ isVisible, onToggle }) => {
    const [players, setPlayers] = useState([]);
    const [activeQuizzes, setActiveQuizzes] = useState(new Map());
    const [quizHistory, setQuizHistory] = useState([]);
    const [selectedTab, setSelectedTab] = useState('players');

    const { socket } = useSocket();

    useEffect(() => {
        if (!socket || !isVisible) return;

        console.log('🎯 Setting up spectator panel listeners');

        // Listen for player coin updates
        const handlePlayerCoinsUpdated = (data) => {
            console.log('💰 Coin update:', data);
            setPlayers(prev => prev.map(player =>
                player.id === data.playerId
                    ? { ...player, coins: data.coins }
                    : player
            ));
        };

        // Listen for scoreboard updates (this has player data)
        const handleScoreboardUpdate = (players) => {
            console.log('📊 Scoreboard update received:', players);
            setPlayers(players);
        };

        // Request initial data
        socket.emit('request-scoreboard');

        socket.on('scoreboard-update', handleScoreboardUpdate);
        socket.on('player-coins-updated', handlePlayerCoinsUpdated);

        return () => {
            socket.off('scoreboard-update', handleScoreboardUpdate);
            socket.off('player-coins-updated', handlePlayerCoinsUpdated);
        };
    }, [socket, isVisible]);

    const getRankIcon = (index) => {
        if (index === 0) return '🥇';
        if (index === 1) return '🥈';
        if (index === 2) return '🥉';
        return `#${index + 1}`;
    };

    if (!isVisible) return null;

    return (
        <div className="spectator-panel">
            {/* Header */}
            <div className="spectator-header">
                <h3>👁️ Spectator View</h3>
                <button onClick={onToggle} className="spectator-close-btn">
                    ✕
                </button>
            </div>

            {/* Tabs */}
            <div className="spectator-tabs">
                <button
                    className={`tab ${selectedTab === 'players' ? 'active' : ''}`}
                    onClick={() => setSelectedTab('players')}
                >
                    Players ({players.length})
                </button>
                <button
                    className={`tab ${selectedTab === 'quizzes' ? 'active' : ''}`}
                    onClick={() => setSelectedTab('quizzes')}
                >
                    Active Quizzes ({activeQuizzes.size})
                </button>
                <button
                    className={`tab ${selectedTab === 'history' ? 'active' : ''}`}
                    onClick={() => setSelectedTab('history')}
                >
                    Quiz History
                </button>
            </div>

            {/* Content */}
            <div className="spectator-content">
                {selectedTab === 'players' && (
                    <div className="players-tab">
                        <h4>Player Rankings</h4>
                        {players.length === 0 ? (
                            <p className="no-data">No players in game</p>
                        ) : (
                            <div className="players-ranking">
                                {players
                                    .sort((a, b) => b.coins - a.coins)
                                    .map((player, index) => (
                                        <div key={player.id} className="player-rank-item">
                                            <span className="rank">{getRankIcon(index)}</span>
                                            <span className="player-name" title={player.name}>
                                                {player.name}
                                            </span>
                                            <span className="coins">{player.coins} coins</span>
                                            {activeQuizzes.has(player.id) && (
                                                <span className="quiz-indicator" title="Taking quiz">
                                                    ❓
                                                </span>
                                            )}
                                        </div>
                                    ))
                                }
                            </div>
                        )}
                    </div>
                )}

                {selectedTab === 'quizzes' && (
                    <div className="quizzes-tab">
                        <h4>Active Quizzes</h4>
                        {activeQuizzes.size === 0 ? (
                            <p className="no-data">No active quizzes</p>
                        ) : (
                            <div className="active-quizzes">
                                {Array.from(activeQuizzes.entries()).map(([playerId, quiz]) => (
                                    <div key={playerId} className="active-quiz">
                                        <div className="quiz-player">
                                            <strong>{quiz.playerName}</strong>
                                            <span className="quiz-time">
                                                Started: {quiz.startTime.toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <div className="quiz-question">
                                            <em>"{quiz.question}"</em>
                                        </div>
                                        <div className="quiz-status in-progress">
                                            In Progress...
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {selectedTab === 'history' && (
                    <div className="history-tab">
                        <h4>Recent Quiz Results</h4>
                        {quizHistory.length === 0 ? (
                            <p className="no-data">No quiz history yet</p>
                        ) : (
                            <div className="quiz-history">
                                {quizHistory.map((quiz, index) => (
                                    <div key={index} className="history-item">
                                        <div className="history-header">
                                            <strong>{quiz.playerName}</strong>
                                            <span className={`result ${quiz.isCorrect ? 'correct' : 'incorrect'}`}>
                                                {quiz.isCorrect ? '✅ Correct' : '❌ Incorrect'}
                                                ({quiz.coinsChange})
                                            </span>
                                        </div>
                                        <div className="history-question">
                                            {quiz.question}
                                        </div>
                                        <div className="history-time">
                                            {quiz.timestamp.toLocaleTimeString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SpectatorPanel;