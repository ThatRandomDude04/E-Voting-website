import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import './App.css'
import { positions, validIds, createEmptySelection, createInitialVoteTotals } from './data.js'
import { getApiUrl } from './api.js'

/* eslint-disable react/prop-types */

const Confetti = () => {
  const [particles, setParticles] = useState([])

  useEffect(() => {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b', '#6c5ce7', '#a29bfe']
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: -10,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      speed: Math.random() * 3 + 2,
      angle: Math.random() * 360
    }))
    setParticles(newParticles)

    const interval = setInterval(() => {
      setParticles(prev => prev.map(particle => ({
        ...particle,
        y: particle.y + particle.speed,
        x: particle.x + Math.sin(particle.angle) * 0.5
      })).filter(particle => particle.y < window.innerHeight + 20))
    }, 16)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="confetti-container">
      {particles.map(particle => (
        <div
          key={particle.id}
          className="confetti-particle"
          style={{
            left: particle.x,
            top: particle.y,
            backgroundColor: particle.color,
            width: particle.size,
            height: particle.size,
            transform: `rotate(${particle.angle}deg)`
          }}
        />
      ))}
    </div>
  )
}

const Navigation = ({ darkMode, setDarkMode }) => {
  const location = useLocation()

  return (
    <nav className="main-nav">
      <div className="nav-container">
        <div className="nav-logo">
          <h2>🗳️ NNSS Voting</h2>
        </div>
        <ul className="nav-links">
          <li><Link to="/" className={location.pathname === '/' ? 'active' : ''}>Vote</Link></li>
          <li><Link to="/results" className={location.pathname === '/results' ? 'active' : ''}>Results</Link></li>
          <li><Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''}>Admin</Link></li>
          <li><Link to="/about" className={location.pathname === '/about' ? 'active' : ''}>About</Link></li>
        </ul>
        <button
          className="theme-toggle"
          onClick={() => setDarkMode(!darkMode)}
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </nav>
  )
}

const LoginPage = ({ darkMode, setDarkMode, onLogin }) => {
  const [loginId, setLoginId] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    document.body.className = darkMode ? 'dark-mode' : ''
  }, [darkMode])

  const handleLogin = async () => {
    const id = loginId.trim().toUpperCase()
    if (!id) {
      setError('Please enter your student ID.')
      return
    }

    try {
      const response = await fetch(getApiUrl('/api/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password: loginPassword })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        setError(data.message || 'Login failed. Please try again.')
        return
      }
      setError('')
      onLogin(data.id)
    } catch (error) {
      setError('Unable to reach the backend. Please try again.')
    }
  }

  return (
    <div className="page-container">
      <Navigation darkMode={darkMode} setDarkMode={setDarkMode} />
      <div className="container">
        <section className="intro-card login-card">
          <h1>Prefect Election Login</h1>
          <p>Use your student ID and password to access voting. The same ID will be used for the vote.</p>
          <div className="login-form">
            <input
              type="text"
              placeholder="Student ID (e.g. SS2E-001)"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button className="login-btn" onClick={handleLogin}>Continue to Vote</button>
            {error && <p className="error-message">{error}</p>}
          </div>
        </section>
      </div>
    </div>
  )
}

const VotingPage = ({ darkMode, setDarkMode, currentVoterId, onLogout }) => {
  const [selectedCandidates, setSelectedCandidates] = useState(createEmptySelection)
  const [voteTotals, setVoteTotals] = useState(createInitialVoteTotals)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [showConfetti, setShowConfetti] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const totalVotes = Object.values(voteTotals).reduce(
    (sum, candidateCounts) => sum + Object.values(candidateCounts).reduce((countSum, count) => countSum + count, 0),
    0
  )

  useEffect(() => {
    const loadResults = async () => {
      try {
        const response = await fetch(getApiUrl('/api/results'))
        const data = await response.json()
        if (data.success) {
          setVoteTotals(data.voteTotals)
        }
      } catch (error) {
        console.error(error)
      }
    }
    loadResults()
  }, [])

  useEffect(() => {
    document.body.className = darkMode ? 'dark-mode' : ''
  }, [darkMode])

  const handleVote = async () => {
    if (!currentVoterId) {
      setMessageType('error')
      setMessage('No logged in student ID found.')
      return
    }

    const missingPosition = positions.find(position => !selectedCandidates[position.id])
    if (missingPosition) {
      setMessageType('error')
      setMessage(`Select a candidate for ${missingPosition.title} before submitting.`)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(getApiUrl('/api/vote'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterId: currentVoterId, selections: selectedCandidates })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        setMessageType('error')
        setMessage(data.message || 'Vote failed. Please try again.')
        setIsLoading(false)
        return
      }
      setVoteTotals(data.voteTotals)
      setMessageType('success')
      setMessage('Your prefect vote has been recorded. Thank you!')
      setSelectedCandidates(createEmptySelection())
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3000)
    } catch (error) {
      setMessageType('error')
      setMessage('Unable to submit vote. Please try again later.')
    }
    setIsLoading(false)
  }

  return (
    <div className="page-container">
      <Navigation darkMode={darkMode} setDarkMode={setDarkMode} />
      <div className="container">
        <div className="voter-banner">
          <span>Voting as <strong>{currentVoterId}</strong></span>
          <button className="logout-small-btn" onClick={onLogout}>Logout</button>
        </div>

        <header>
          <h1>NNSS Ojo Prefect Election</h1>
          <p>Select one candidate for each prefect position, then submit your vote.</p>
        </header>

        <section className="intro-card">
          <h2>Secure Vote Access</h2>
          <p>The student ID used to login is already locked in. Your vote is recorded under that ID.</p>
        </section>

        <div className="voting-section">
          {positions.map(position => (
            <section className="vote-card" key={position.id}>
              <h3>{position.title}</h3>
              <div className="candidate-list">
                {position.candidates.map(candidate => {
                  const genderIcon = candidate.gender === 'female' ? '♀' : candidate.gender === 'male' ? '♂' : ''
                  return (
                    <button
                      key={candidate.name}
                      className={`candidate-btn ${selectedCandidates[position.id] === candidate.name ? 'selected' : ''}`}
                      onClick={() => setSelectedCandidates(prev => ({ ...prev, [position.id]: candidate.name }))}
                    >
                      {candidate.name} {genderIcon && <span className="gender-icon">{genderIcon}</span>}
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        <button className={`submit-btn ${isLoading ? 'loading' : ''}`} onClick={handleVote} disabled={isLoading}>
          {isLoading ? 'Processing Vote...' : 'Submit Votes'}
        </button>
        <p className={`message ${messageType}`}>{message}</p>
        <p className="vote-count">Backend recorded votes: <span>{totalVotes}</span></p>

        {showConfetti && <Confetti />}
      </div>
    </div>
  )
}

const ResultsPage = ({ darkMode, setDarkMode }) => {
  const [voteTotals, setVoteTotals] = useState(createInitialVoteTotals)

  useEffect(() => {
    const loadResults = async () => {
      try {
        const response = await fetch(getApiUrl('/api/results'))
        const data = await response.json()
        if (data.success) {
          setVoteTotals(data.voteTotals)
        }
      } catch (error) {
        console.error(error)
      }
    }
    loadResults()
  }, [])

  useEffect(() => {
    document.body.className = darkMode ? 'dark-mode' : ''
  }, [darkMode])

  const positionSummaries = positions.map(position => {
    const positionVotes = voteTotals[position.id] || createInitialVoteTotals()[position.id]
    const sortedCandidates = Object.entries(positionVotes).sort(([, a], [, b]) => b - a)
    return {
      position,
      sortedCandidates,
      winner: sortedCandidates[0] || ['No votes yet', 0],
      total: Object.values(positionVotes).reduce((sum, count) => sum + count, 0)
    }
  })

  return (
    <div className="page-container">
      <Navigation darkMode={darkMode} setDarkMode={setDarkMode} />
      <div className="container">
        <header>
          <h1>Election Results</h1>
          <p>Live voting results for the prefect election</p>
        </header>

        <div className="winners-section">
          {positionSummaries.map(({ position, winner }) => (
            <div key={position.id} className="winner-card">
              <h2>{position.title}</h2>
              <div className="winner-name">{winner[0]}</div>
              <div className="winner-votes">{winner[1]} votes</div>
            </div>
          ))}
        </div>

        <div className="results-section">
          {positionSummaries.map(({ position, sortedCandidates, total }) => (
            <section key={position.id} className="results-card">
              <h2>{position.title} Results</h2>
              <div className="results-grid">
                {sortedCandidates.map(([candidate, votes]) => (
                  <div key={candidate} className="result-item">
                    <span>{candidate}</span>
                    <strong className="vote-number">{votes}</strong>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${total > 0 ? (votes / total) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="vote-count">Total votes: <span>{total}</span></p>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

const AdminPage = ({ darkMode, setDarkMode }) => {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [voteTotals, setVoteTotals] = useState(createInitialVoteTotals)
  const [votedIdsCount, setVotedIdsCount] = useState(0)

  useEffect(() => {
    document.body.className = darkMode ? 'dark-mode' : ''
  }, [darkMode])

  const loadAdminData = async () => {
    try {
      const response = await fetch(getApiUrl('/api/results'))
      const data = await response.json()
      if (data.success) {
        setVoteTotals(data.voteTotals)
        setVotedIdsCount(data.votedIdsCount)
      }
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    if (isAdminLoggedIn) {
      loadAdminData()
    }
  }, [isAdminLoggedIn])

  const handleAdminLogin = async () => {
    try {
      const response = await fetch(getApiUrl('/api/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        setPasswordError(data.message || 'Incorrect password. Please try again.')
        return
      }
      setIsAdminLoggedIn(true)
      setPasswordError('')
    } catch (error) {
      setPasswordError('Unable to reach the backend.')
    }
  }

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false)
    setAdminPassword('')
    setPasswordError('')
  }

  const clearAllVotes = async () => {
    try {
      const response = await fetch(getApiUrl('/api/admin/clear'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        alert(data.message || 'Unable to clear votes.')
        return
      }
      await loadAdminData()
      alert('All votes have been cleared!')
    } catch (error) {
      alert('Unable to communicate with the backend.')
    }
  }

  const exportResults = async () => {
    try {
      const response = await fetch(getApiUrl('/api/admin/export'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        alert(data.message || 'Unable to export results.')
        return
      }
      const dataStr = JSON.stringify(data.data, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
      const exportFileDefaultName = `prefect-election-results-${new Date().toISOString().split('T')[0]}.json`
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()
    } catch (error) {
      alert('Unable to export results from the backend.')
    }
  }

  if (!isAdminLoggedIn) {
    return (
      <div className="page-container">
        <Navigation darkMode={darkMode} setDarkMode={setDarkMode} />
        <div className="container">
          <header>
            <h1>Admin Login</h1>
            <p>Enter the admin password to access control panel</p>
          </header>
          <div className="login-form">
            <input 
              type="password" 
              placeholder="Enter admin password" 
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
              className="password-input"
            />
            <button onClick={handleAdminLogin} className="login-btn">Login</button>
            {passwordError && <p className="error-message">{passwordError}</p>}
          </div>
        </div>
      </div>
    )
  }

  const totalVotes = Object.values(voteTotals).reduce(
    (sum, candidateCounts) => sum + Object.values(candidateCounts).reduce((countSum, count) => countSum + count, 0),
    0
  )

  return (
    <div className="page-container">
      <Navigation darkMode={darkMode} setDarkMode={setDarkMode} />
      <div className="container">
        <header>
          <h1>Admin Panel</h1>
          <p>Manage election data and results</p>
        </header>

        <div className="admin-controls">
          <button className="admin-btn export-btn" onClick={exportResults}>
            📊 Export Results
          </button>
          <button className="admin-btn clear-btn" onClick={clearAllVotes}>
            🗑️ Clear All Votes
          </button>
          <button className="admin-btn logout-btn" onClick={handleAdminLogout}>
            🚪 Logout
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Voters</h3>
            <div className="stat-number">{votedIdsCount}</div>
          </div>
          <div className="stat-card">
            <h3>Total Votes Cast</h3>
            <div className="stat-number">{totalVotes}</div>
          </div>
          <div className="stat-card">
            <h3>Prefect Positions</h3>
            <div className="stat-number">{positions.length}</div>
          </div>
          <div className="stat-card">
            <h3>Valid Student IDs</h3>
            <div className="stat-number">{validIds.length}</div>
          </div>
        </div>

        <section className="admin-section">
          <h2>Current Position Leaders</h2>
          <div className="voted-ids-list">
            {positions.map(position => {
              const positionVotes = voteTotals[position.id] || {}
              const sorted = Object.entries(positionVotes).sort(([, a], [, b]) => b - a)
              const leader = sorted[0] || ['No votes', 0]
              return (
                <div key={position.id} className="position-summary">
                  <strong>{position.title}: </strong>
                  {leader[0]} ({leader[1]} votes)
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

const AboutPage = ({ darkMode, setDarkMode }) => {
  useEffect(() => {
    document.body.className = darkMode ? 'dark-mode' : ''
  }, [darkMode])

  return (
    <div className="page-container">
      <Navigation darkMode={darkMode} setDarkMode={setDarkMode} />
      <div className="container">
        <header>
          <h1>About the Election</h1>
          <p>Learn about our democratic prefect process</p>
        </header>

        <section className="about-section">
          <div className="about-card">
            <h2>🎓 Our Mission</h2>
            <p>To provide SS2 Ekun students with a fair and transparent voting system for electing prefects across many positions.</p>
          </div>

          <div className="about-card">
            <h2>📋 Election Rules</h2>
            <ul>
              <li>Only valid SS2E student IDs can vote</li>
              <li>Each student can vote only once</li>
              <li>Every prefect position must have one selected candidate</li>
              <li>Votes are recorded on the server and results are updated automatically</li>
            </ul>
          </div>

          <div className="about-card">
            <h2>👥 Prefect Positions</h2>
            <p>This election supports many prefect roles, and each role can include male or female candidates. Candidate gender is shown with an icon for easier identification.</p>
          </div>

          <div className="about-card">
            <h2>🛡️ Security & Privacy</h2>
            <p>Your votes are stored securely on the backend server. Student IDs are verified against our valid ID list, and each ID can only vote once. No personal information is collected beyond your student ID.</p>
          </div>
        </section>
      </div>
    </div>
  )
}

function App() {
  const storedId = localStorage.getItem('currentVoterId') || ''
  const [darkMode, setDarkMode] = useState(false)
  const [currentVoterId, setCurrentVoterId] = useState(storedId)
  const [isVoterAuthenticated, setIsVoterAuthenticated] = useState(Boolean(storedId))

  const handleVoterLogin = (id) => {
    setCurrentVoterId(id)
    setIsVoterAuthenticated(true)
    localStorage.setItem('currentVoterId', id)
  }

  const handleVoterLogout = () => {
    setCurrentVoterId('')
    setIsVoterAuthenticated(false)
    localStorage.removeItem('currentVoterId')
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            isVoterAuthenticated ? (
              <VotingPage
                darkMode={darkMode}
                setDarkMode={setDarkMode}
                currentVoterId={currentVoterId}
                onLogout={handleVoterLogout}
              />
            ) : (
              <LoginPage
                darkMode={darkMode}
                setDarkMode={setDarkMode}
                onLogin={handleVoterLogin}
              />
            )
          }
        />
        <Route path="/results" element={<ResultsPage darkMode={darkMode} setDarkMode={setDarkMode} />} />
        <Route path="/admin" element={<AdminPage darkMode={darkMode} setDarkMode={setDarkMode} />} />
        <Route path="/about" element={<AboutPage darkMode={darkMode} setDarkMode={setDarkMode} />} />
      </Routes>
    </Router>
  )
}

export default App
