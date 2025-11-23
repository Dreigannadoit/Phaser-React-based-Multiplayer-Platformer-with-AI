import React, { useState, useEffect } from 'react';

const RespawnCountdown = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [isRespawning, setIsRespawning] = useState(false);
    const [totalRespawnTime, setTotalRespawnTime] = useState(10); // Store the initial time

    useEffect(() => {
        const handleRespawnStart = (event) => {
            setIsRespawning(true);
            setIsVisible(true);
            const startTime = event.detail.time || 10;
            setCountdown(startTime);
            setTotalRespawnTime(startTime); // Store the total time
        };

        const handleRespawnUpdate = (event) => {
            setCountdown(event.detail.time);
        };

        const handleRespawnEnd = () => {
            setIsVisible(false);
            setIsRespawning(false);
            setCountdown(0);
        };

        // Listen for respawn events from the game
        window.addEventListener('respawnStart', handleRespawnStart);
        window.addEventListener('respawnUpdate', handleRespawnUpdate);
        window.addEventListener('respawnEnd', handleRespawnEnd);

        return () => {
            window.removeEventListener('respawnStart', handleRespawnStart);
            window.removeEventListener('respawnUpdate', handleRespawnUpdate);
            window.removeEventListener('respawnEnd', handleRespawnEnd);
        };
    }, []);

    if (!isVisible) return null;

    // FIXED: Calculate progress as time elapsed, not time remaining
    const progress = ((totalRespawnTime - countdown) / totalRespawnTime) * 100;
    const secondsLeft = Math.ceil(countdown);

    return (
        <div className="respawn-countdown-container">
            {/* Spiral Binding (similar to scoreboard) */}
            <div className="respawn-countdown-spiral"></div>
            
            <div className="respawn-countdown-content">
                {/* Header */}
                <div className="respawn-countdown-header">
                    <div className="respawn-skull-icon">💀</div>
                    <h2>You Died!</h2>
                </div>

                {/* Countdown Display */}
                <div className="respawn-countdown-display">
                    <div className="countdown-text">
                        Respawning in <span className="countdown-number">{secondsLeft}</span>
                    </div>
                    
                    {/* Progress Bar - NOW FILLS UP OVER TIME */}
                    <div className="respawn-progress-container">
                        <div 
                            className="respawn-progress-bar"
                            style={{ width: `${progress}%` }}
                        ></div>
                        <div className="respawn-progress-ticks">
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((tick) => (
                                <div 
                                    key={tick}
                                    className={`progress-tick ${progress >= (tick * 10) ? 'active' : ''}`}
                                ></div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tips Section */}
                <div className="respawn-tips">
                    <h3>Quick Tips:</h3>
                    <ul>
                        <li>Watch out for spikes!</li>
                        <li>Collect coins to earn points</li>
                        <li>Answer quizzes correctly for bonuses</li>
                    </ul>
                </div>

                {/* Visual Effect Indicator */}
                <div className={`respawn-visual-effect ${secondsLeft <= 3 ? 'pulsing' : ''}`}>
                    {secondsLeft <= 3 && 'Get Ready!'}
                </div>
            </div>
        </div>
    );
};

export default RespawnCountdown;