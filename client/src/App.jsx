import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './components/Home/Home'
import Room from './components/Room/Room'
import Game from './components/Game/Game'
import { SocketProvider } from './context/SocketContext'
import { MusicProvider } from './context/MusicContext' // Add this
import PDFUpload from './components/PDF/PDFUpload'
import ScoreboardPage from './components/Scoreboard/ScoreboardPage'
import Title from './Pages/Title'

function App() {
  return (
    <SocketProvider>
      <MusicProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Title />} />
            <Route path="/home" element={<Home />} />
            <Route path="/room/:roomId" element={<Room />} />
            <Route path="/game/:roomId" element={<Game />} />
            <Route path="/pdf-upload/:roomId" element={<PDFUpload />} />
            <Route path="/scoreboard/:roomId" element={<ScoreboardPage />} />
          </Routes>
        </Router>
      </MusicProvider>
    </SocketProvider>
  )
}

export default App