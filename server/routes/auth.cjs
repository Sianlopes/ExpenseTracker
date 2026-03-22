const express = require('express')
const bcrypt = require('bcrypt')
const db = require('../db.cjs')

const router = express.Router()
const SALT_ROUNDS = 10

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' })
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters.' })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' })
    }

    // Check if username exists
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim())
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists. Please log in.' })
    }

    // Check if email exists
    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase())
    if (existingEmail) {
      return res.status(409).json({ error: 'This email is already registered.' })
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

    const result = db.prepare(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)'
    ).run(username.trim(), email.trim().toLowerCase(), hashedPassword)

    req.session.userId = result.lastInsertRowid
    req.session.username = username.trim()

    res.json({ username: username.trim() })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Server error. Please try again.' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' })
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim())
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' })
    }

    const match = await bcrypt.compare(password, user.password)
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password.' })
    }

    req.session.userId = user.id
    req.session.username = user.username

    res.json({ username: user.username })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Server error. Please try again.' })
  }
})

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out.' })
    }
    res.clearCookie('connect.sid')
    res.json({ success: true })
  })
})

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (req.session && req.session.userId) {
    return res.json({ username: req.session.username })
  }
  res.status(401).json({ error: 'Not authenticated.' })
})

// POST /api/auth/forgot-password
router.post('/forgot-password', (req, res) => {
  const { email } = req.body

  if (!email) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }

  const user = db.prepare('SELECT id, username FROM users WHERE email = ?').get(email.trim().toLowerCase())
  if (!user) {
    return res.status(404).json({ error: 'No account found with this email address.' })
  }

  // In a real app, you'd send an email with a reset token
  // For this demo, we return the username so the frontend can proceed to reset
  res.json({ username: user.username })
})

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { username, newPassword } = req.body

    if (!username || !newPassword) {
      return res.status(400).json({ error: 'Username and new password are required.' })
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters.' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS)

    const result = db.prepare('UPDATE users SET password = ? WHERE username = ?').run(hashedPassword, username.trim())

    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found.' })
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Reset password error:', err)
    res.status(500).json({ error: 'Server error. Please try again.' })
  }
})

module.exports = router
