// App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './components/Home/Home'
import Room from './components/Room/Room'
import Game from './components/Game/Game'
import { SocketProvider } from './context/SocketContext'

function App() {
  return (
    <SocketProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:roomId" element={<Room />} />
          <Route path="/game/:roomId" element={<Game />} />
        </Routes>
      </Router>
    </SocketProvider>
  )
}

export default App