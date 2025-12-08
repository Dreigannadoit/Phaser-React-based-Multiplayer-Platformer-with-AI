import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useMusic } from '../context/MusicContext';

const ROUTE_MUSIC_MAP = {
    '/home': 'lobby',
    '/scoreboard/': 'lobby',
    '/room/': 'room',
    '/game/': 'game',
    '/pdf-upload/': 'room'
};

export const useRouteMusic = () => {
    const location = useLocation();
    const { changeMusic } = useMusic();

    useEffect(() => {
        const path = location.pathname;

        // Find which music should play for this route
        let musicType = null;

        // Check for specific routes first
        for (const [route, music] of Object.entries(ROUTE_MUSIC_MAP)) {
            if (path.startsWith(route)) {
                musicType = music;
                break;
            }
        }

        // Change music based on route
        changeMusic(musicType);
    }, [location.pathname, changeMusic]);
};