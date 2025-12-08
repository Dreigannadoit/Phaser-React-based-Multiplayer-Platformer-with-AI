import React from 'react'
import { useNavigate } from 'react-router-dom'

const Title = () => {
  const navigate = useNavigate()

  const handleStartGame = () => {
    navigate('/home')
  }

  return (
    <div className="title-container">
      <div className="title-content">
        <div className="game-title">
          <h1 className="main-title">THE</h1>
          <h1 className="main-title">NOTEBOOK</h1>
        </div>
        
        <button 
          className="start-button pixel-button"
          onClick={handleStartGame}
        >
          START GAME
        </button>
      </div>
    </div>
  )
}

export default Title