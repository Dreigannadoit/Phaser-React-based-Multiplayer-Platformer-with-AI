import React, { createContext, useState, useContext, useEffect, useRef } from 'react';

const MusicContext = createContext();

// Music file paths
const MUSIC_FILES = {
    lobby: '/assets/music/lobby.mp3',
    room: '/assets/music/room.mp3',
    game: '/assets/music/game.mp3'
};

export const MusicProvider = ({ children }) => {
    const [currentMusic, setCurrentMusic] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const audioRef = useRef(null);
    const currentMusicTypeRef = useRef(null);
    const fadeIntervalRef = useRef(null);

    // Initialize audio on mount
    useEffect(() => {
        // Create audio element
        const audio = new Audio();
        audio.loop = true;
        audio.volume = 0;
        audio.preload = 'auto';

        // Event listeners
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleEnded = () => setIsPlaying(false);
        const handleError = (e) => {
            console.error('Music error:', e);
            setIsPlaying(false);
            setIsLoading(false);
        };
        const handleLoadStart = () => setIsLoading(true);
        const handleCanPlay = () => setIsLoading(false);

        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);
        audio.addEventListener('loadstart', handleLoadStart);
        audio.addEventListener('canplay', handleCanPlay);

        audioRef.current = audio;

        // Cleanup on unmount
        return () => {
            if (audioRef.current) {
                audioRef.current.removeEventListener('play', handlePlay);
                audioRef.current.removeEventListener('pause', handlePause);
                audioRef.current.removeEventListener('ended', handleEnded);
                audioRef.current.removeEventListener('error', handleError);
                audioRef.current.removeEventListener('loadstart', handleLoadStart);
                audioRef.current.removeEventListener('canplay', handleCanPlay);

                audioRef.current.pause();
                audioRef.current = null;
            }
            if (fadeIntervalRef.current) {
                clearInterval(fadeIntervalRef.current);
                fadeIntervalRef.current = null;
            }
        };
    }, []);

    // Function to safely access audioRef
    const getAudio = () => {
        if (!audioRef.current) {
            // Recreate if null (shouldn't happen, but just in case)
            const audio = new Audio();
            audio.loop = true;
            audio.volume = 0;
            audio.preload = 'auto';
            audioRef.current = audio;
        }
        return audioRef.current;
    };

    // Function to fade music in
    const fadeIn = (duration = 1000) => {
        const audio = getAudio();
        if (!audio) return;

        audio.volume = 0;
        const steps = 10;
        const stepDuration = duration / steps;
        const volumeStep = 0.5 / steps;

        let step = 0;

        if (fadeIntervalRef.current) {
            clearInterval(fadeIntervalRef.current);
        }

        fadeIntervalRef.current = setInterval(() => {
            step++;
            const newVolume = Math.min(0.5, step * volumeStep);
            audio.volume = newVolume;

            if (step >= steps) {
                clearInterval(fadeIntervalRef.current);
                fadeIntervalRef.current = null;
            }
        }, stepDuration);
    };

    // Function to fade music out
    const fadeOut = (duration = 500, onComplete) => {
        const audio = getAudio();
        if (!audio || audio.volume === 0) {
            onComplete?.();
            return;
        }

        const steps = 10;
        const stepDuration = duration / steps;
        const initialVolume = audio.volume;
        const volumeStep = initialVolume / steps;

        let step = 0;

        if (fadeIntervalRef.current) {
            clearInterval(fadeIntervalRef.current);
        }

        fadeIntervalRef.current = setInterval(() => {
            step++;
            const newVolume = Math.max(0, initialVolume - (step * volumeStep));
            audio.volume = newVolume;

            if (step >= steps) {
                clearInterval(fadeIntervalRef.current);
                fadeIntervalRef.current = null;
                onComplete?.();
            }
        }, stepDuration);
    };

    // Main function to change music
    const changeMusic = async (musicType, immediate = false) => {
        // Check if audioRef exists
        if (!audioRef.current) {
            console.warn('Audio ref not initialized yet');
            return;
        }

        const audio = audioRef.current;

        // If same music is already playing, do nothing
        if (currentMusicTypeRef.current === musicType && isPlaying) {
            return;
        }

        // If no music type provided or invalid, stop music
        if (!musicType || !MUSIC_FILES[musicType]) {
            if (audio.src) {
                fadeOut(500, () => {
                    audio.pause();
                    audio.currentTime = 0;
                    audio.src = '';
                });
            }
            currentMusicTypeRef.current = null;
            setCurrentMusic(null);
            return;
        }

        const musicPath = MUSIC_FILES[musicType];

        // If different music is playing, fade out first
        if (currentMusicTypeRef.current && currentMusicTypeRef.current !== musicType) {
            await new Promise(resolve => {
                fadeOut(500, () => {
                    resolve();
                });
            });
        }

        // Set new music
        try {
            audio.src = musicPath;
            currentMusicTypeRef.current = musicType;
            setCurrentMusic(musicType);

            // Try to play
            const playPromise = audio.play();

            if (playPromise !== undefined) {
                await playPromise;
                if (immediate) {
                    audio.volume = 0.5;
                } else {
                    fadeIn(1000);
                }
            }
        } catch (err) {
            console.log('Autoplay prevented or error:', err);

            // Store current music type for later play
            const currentType = musicType;

            // Set up user interaction handler
            const handleUserInteraction = async () => {
                try {
                    // Check if we're still supposed to play this music
                    if (currentMusicTypeRef.current === currentType) {
                        await audio.play();
                        fadeIn(1000);
                    }
                    document.removeEventListener('click', handleUserInteraction);
                    document.removeEventListener('keydown', handleUserInteraction);
                    document.removeEventListener('touchstart', handleUserInteraction);
                } catch (playErr) {
                    console.error('Error playing audio:', playErr);
                }
            };

            // Add event listeners with cleanup
            const cleanup = () => {
                document.removeEventListener('click', handleUserInteraction);
                document.removeEventListener('keydown', handleUserInteraction);
                document.removeEventListener('touchstart', handleUserInteraction);
            };

            document.addEventListener('click', handleUserInteraction, { once: true });
            document.addEventListener('keydown', handleUserInteraction, { once: true });
            document.addEventListener('touchstart', handleUserInteraction, { once: true });

            // Return cleanup function
            return cleanup;
        }
    };

    // Stop music
    const stopMusic = () => {
        changeMusic(null);
    };

    // Toggle play/pause
    const togglePlay = () => {
        const audio = getAudio();
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else if (currentMusicTypeRef.current) {
            audio.play().catch(console.error);
        }
    };

    // Set volume (0 to 1)
    const setVolume = (volume) => {
        const audio = getAudio();
        if (audio) {
            const normalizedVolume = Math.max(0, Math.min(1, volume));
            audio.volume = normalizedVolume;
        }
    };

    return (
        <MusicContext.Provider value={{
            currentMusic,
            isPlaying,
            isLoading,
            changeMusic,
            stopMusic,
            togglePlay,
            setVolume
        }}>
            {children}
        </MusicContext.Provider>
    );
};

export const useMusic = () => {
    const context = useContext(MusicContext);
    if (!context) {
        throw new Error('useMusic must be used within a MusicProvider');
    }
    return context;
};