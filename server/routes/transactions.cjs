const express = require('express')
const crypto = require('crypto')
const db = require('../db.cjs')

const router = express.Router()

// Auth middleware — all transaction routes require login
router.use((req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated.' })
  }
  next()
})

// GET /api/transactions
router.get('/', (req, res) => {
  const rows = db.prepare(
    'SELECT id, description, amount, type, category, date FROM transactions WHERE user_id = ? ORDER BY date DESC, id DESC'
  ).all(req.session.userId)

  res.json(rows)
})

// POST /api/transactions
router.post('/', (req, res) => {
  const { description, amount, type, category, date } = req.body

  if (!description || !amount || !type || !category || !date) {
    return res.status(400).json({ error: 'All fields are required.' })
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number.' })
  }

  if (type !== 'income' && type !== 'expense') {
    return res.status(400).json({ error: 'Type must be income or expense.' })
  }

  const id = crypto.randomUUID()

  db.prepare(
    'INSERT INTO transactions (id, user_id, description, amount, type, category, date) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.session.userId, description.trim(), amount, type, category, date)

  res.json({ id, description: description.trim(), amount, type, category, date })
})

// DELETE /api/transactions/clear
router.delete('/clear', (req, res) => {
  db.prepare('DELETE FROM transactions WHERE user_id = ?').run(req.session.userId)
  res.json({ success: true })
})

// DELETE /api/transactions/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare(
    'DELETE FROM transactions WHERE id = ? AND user_id = ?'
  ).run(req.params.id, req.session.userId)

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Transaction not found.' })
  }

  res.json({ success: true })
})

module.exports = router
