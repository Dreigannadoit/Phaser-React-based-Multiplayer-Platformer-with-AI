import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';

const ExitGame = () => {
    const navigate = useNavigate();
    const { socket } = useSocket();
    const [showConfirm, setShowConfirm] = useState(false);

    const handleExitGame = () => {
        // Get current room and player data
        const playerData = JSON.parse(localStorage.getItem('playerData') || '{}');
        const roomId = playerData.roomId;

        console.log('🚪 Exiting game...', { roomId, playerName: playerData.playerName });

        // Notify server that player is leaving
        if (socket && roomId) {
            socket.emit('leave-game', roomId);
        }

        // Clean up game data
        localStorage.removeItem('playerData');
        localStorage.removeItem('gameState');
        localStorage.removeItem('playerProgress');

        // Clean up Phaser game instance if it exists
        if (window.gameScene) {
            try {
                window.gameScene.game.destroy(true);
            } catch (error) {
                console.log('Game cleanup completed');
            }
        }

        // Clean up multiplayer manager
        if (window.multiplayerManager) {
            window.multiplayerManager.cleanup();
            window.multiplayerManager = null;
        }

        // Navigate to home
        navigate('/home');
    };

    const handleConfirmExit = () => {
        setShowConfirm(true);
    };

    const handleCancelExit = () => {
        setShowConfirm(false);
    };

    return (
        <>
            {/* Exit Game Button */}
            <button
                onClick={handleConfirmExit}
                className="exit-game-button"
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    left: '20px',
                    zIndex: 1000,
                    background: 'var(--pixel-red)',
                    border: '3px solid var(--pixel-dark)',
                    color: 'white',
                    padding: '10px 15px',
                    cursor: 'pointer',
                    fontFamily: 'VT323, monospace',
                    fontSize: '1.2rem',
                    boxShadow: '3px 3px 0 var(--pixel-dark)',
                    borderRadius: '5px',
                    transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                    e.target.style.background = 'var(--pixel-dark-red)';
                    e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                    e.target.style.background = 'var(--pixel-red)';
                    e.target.style.transform = 'translateY(0)';
                }}
            >
                🚪 Exit Game
            </button>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 2000
                    }}
                >
                    <div
                        style={{
                            background: 'var(--pixel-gray)',
                            border: '4px solid var(--pixel-dark)',
                            borderRadius: '10px',
                            padding: '30px',
                            textAlign: 'center',
                            maxWidth: '400px',
                            boxShadow: '5px 5px 0 var(--pixel-dark)'
                        }}
                    >
                        <h2 style={{
                            fontFamily: 'VT323, monospace',
                            fontSize: '2rem',
                            color: 'var(--pixel-red)',
                            marginBottom: '20px'
                        }}>
                            Exit Game?
                        </h2>
                        <p style={{
                            fontFamily: 'VT323, monospace',
                            fontSize: '1.4rem',
                            color: 'white',
                            marginBottom: '30px'
                        }}>
                            Are you sure you want to leave the game?
                        </p>
                        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                            <button
                                onClick={handleCancelExit}
                                style={{
                                    background: 'var(--pixel-gray-light)',
                                    border: '3px solid var(--pixel-dark)',
                                    color: 'var(--pixel-dark)',
                                    padding: '10px 20px',
                                    cursor: 'pointer',
                                    fontFamily: 'VT323, monospace',
                                    fontSize: '1.2rem',
                                    boxShadow: '3px 3px 0 var(--pixel-dark)',
                                    borderRadius: '5px'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'var(--pixel-gray)';
                                    e.target.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'var(--pixel-gray-light)';
                                    e.target.style.transform = 'translateY(0)';
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleExitGame}
                                style={{
                                    background: 'var(--pixel-red)',
                                    border: '3px solid var(--pixel-dark)',
                                    color: 'white',
                                    padding: '10px 20px',
                                    cursor: 'pointer',
                                    fontFamily: 'VT323, monospace',
                                    fontSize: '1.2rem',
                                    boxShadow: '3px 3px 0 var(--pixel-dark)',
                                    borderRadius: '5px'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'var(--pixel-dark-red)';
                                    e.target.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'var(--pixel-red)';
                                    e.target.style.transform = 'translateY(0)';
                                }}
                            >
                                Yes, Exit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ExitGame;