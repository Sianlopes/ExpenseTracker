const express = require('express')
const Transaction = require('../models/Transaction.cjs')

const router = express.Router()

// Auth middleware — all transaction routes require login
router.use((req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated.' })
  }
  next()
})

// GET /api/transactions
router.get('/', async (req, res) => {
  try {
    const transactions = await Transaction.find({ user_id: req.session.userId })
      // Sort by date DESC, then by created_at DESC
      .sort({ date: -1, created_at: -1 })
      .lean()

    // Map _id to id for the frontend
    const mappedTransactions = transactions.map(t => {
      t.id = t._id.toString()
      delete t._id
      delete t.__v
      return t
    })

    res.json(mappedTransactions)
  } catch (err) {
    console.error('Get transactions error:', err)
    res.status(500).json({ error: 'Failed to fetch transactions.' })
  }
})

// POST /api/transactions
router.post('/', async (req, res) => {
  try {
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

    const docData = {
      user_id: req.session.userId,
      description: description.trim(),
      amount,
      type,
      category,
      date,
      created_at: Date.now()
    }

    const newTransaction = new Transaction(docData)
    await newTransaction.save()

    res.json({ id: newTransaction._id.toString(), ...docData })
  } catch (err) {
    console.error('Add transaction error:', err)
    res.status(500).json({ error: 'Failed to add transaction.' })
  }
})

// DELETE /api/transactions/clear
router.delete('/clear', async (req, res) => {
  try {
    await Transaction.deleteMany({ user_id: req.session.userId })
    res.json({ success: true })
  } catch (err) {
    console.error('Clear transactions error:', err)
    res.status(500).json({ error: 'Failed to clear transactions.' })
  }
})

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res) => {
  try {
    const doc = await Transaction.findOne({ _id: req.params.id, user_id: req.session.userId })

    if (!doc) {
      return res.status(404).json({ error: 'Transaction not found.' })
    }

    await Transaction.deleteOne({ _id: req.params.id })
    res.json({ success: true })
  } catch (err) {
    console.error('Delete transaction error:', err)
    res.status(500).json({ error: 'Failed to delete transaction.' })
  }
})

module.exports = router
