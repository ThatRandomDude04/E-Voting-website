import express from 'express'
import cors from 'cors'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { positions, validIds, VOTER_PASSWORD, ADMIN_PASSWORD, createInitialVoteTotals } from '../src/data.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_FILE = path.join(__dirname, '..', 'data.json')

const app = express()

app.use(cors())
app.use(express.json())

const defaultData = {
  voteTotals: createInitialVoteTotals(),
  votedIds: []
}

async function loadData() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8')
    return JSON.parse(raw)
  } catch (error) {
    return { ...defaultData }
  }
}

async function saveData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
}

app.get('/api/ping', (req, res) => {
  res.json({ success: true, message: 'Backend is alive' })
})

app.post('/api/login', async (req, res) => {
  const { id, password } = req.body
  if (!id || !password) {
    return res.status(400).json({ success: false, message: 'Student ID and password are required.' })
  }

  const normalizedId = id.trim().toUpperCase()
  if (!validIds.includes(normalizedId)) {
    return res.status(401).json({ success: false, message: 'Student ID not recognized.' })
  }

  if (password !== VOTER_PASSWORD) {
    return res.status(401).json({ success: false, message: 'Incorrect password.' })
  }

  res.json({ success: true, id: normalizedId })
})

app.post('/api/vote', async (req, res) => {
  const { voterId, selections } = req.body
  if (!voterId || !selections) {
    return res.status(400).json({ success: false, message: 'Voter ID and selections are required.' })
  }

  const normalizedId = voterId.trim().toUpperCase()
  if (!validIds.includes(normalizedId)) {
    return res.status(401).json({ success: false, message: 'Voter ID not recognized.' })
  }

  const data = await loadData()
  if (data.votedIds.includes(normalizedId)) {
    return res.status(403).json({ success: false, message: 'This student ID has already voted.' })
  }

  const missingPosition = positions.find(position => !selections[position.id])
  if (missingPosition) {
    return res.status(400).json({ success: false, message: `Select a candidate for ${missingPosition.title} before submitting.` })
  }

  const nextTotals = { ...data.voteTotals }
  positions.forEach(position => {
    const candidateName = selections[position.id]
    nextTotals[position.id] = {
      ...nextTotals[position.id],
      [candidateName]: (nextTotals[position.id][candidateName] ?? 0) + 1
    }
  })

  const nextVotedIds = [...data.votedIds, normalizedId]
  const nextData = {
    voteTotals: nextTotals,
    votedIds: nextVotedIds
  }

  await saveData(nextData)
  res.json({ success: true, voteTotals: nextTotals, votedIdsCount: nextVotedIds.length })
})

app.get('/api/results', async (req, res) => {
  const data = await loadData()
  const totalVotes = Object.values(data.voteTotals).reduce(
    (sum, candidateCounts) => sum + Object.values(candidateCounts).reduce((countSum, count) => countSum + count, 0),
    0
  )

  res.json({
    success: true,
    voteTotals: data.voteTotals,
    votedIdsCount: data.votedIds.length,
    totalVotes,
    positions
  })
})

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body
  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true })
  }

  res.status(401).json({ success: false, message: 'Incorrect admin password.' })
})

app.post('/api/admin/clear', async (req, res) => {
  const { password } = req.body
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'Incorrect admin password.' })
  }

  await saveData({ ...defaultData })
  res.json({ success: true, message: 'All votes cleared.' })
})

app.post('/api/admin/export', async (req, res) => {
  const { password } = req.body
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'Incorrect admin password.' })
  }

  const data = await loadData()
  res.json({ success: true, data: {
    voteTotals: data.voteTotals,
    positions,
    votedIds: data.votedIds,
    totalVotes: Object.values(data.voteTotals).reduce(
      (sum, candidateCounts) => sum + Object.values(candidateCounts).reduce((countSum, count) => countSum + count, 0),
      0
    ),
    exportDate: new Date().toISOString()
  }})
})

export default app
