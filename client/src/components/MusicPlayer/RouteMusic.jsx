import { useEffect } from 'react';
import { useMusic } from '../../context/MusicContext';

const RouteMusic = ({ musicType }) => {
  const { changeMusic } = useMusic();

  useEffect(() => {
    // Store the cleanup function
    let cleanup = null;

    // Change music when component mounts
    const setupMusic = async () => {
      try {
        cleanup = await changeMusic(musicType);
      } catch (error) {
        console.error('Error setting up music:', error);
      }
    };

    setupMusic();

    // Cleanup when component unmounts
    return () => {
      // Call cleanup if it exists
      if (typeof cleanup === 'function') {
        cleanup();
      }
      
      // Only stop music if we're the one who started it
      // (This prevents stopping music when switching between same-music routes)
      if (musicType) {
        // The MusicContext will handle stopping if needed
      }
    };
  }, [musicType, changeMusic]);

  return null; // This component doesn't render anything
};

export default RouteMusic;