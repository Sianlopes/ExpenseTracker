import { useEffect, useMemo, useState } from 'react'

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Dividends', 'Business', 'Capital Gains', 'Other Income']
const EXPENSE_CATEGORIES = [
  'Needs',
  'Health',
  'Insurance',
  'Investment',
  'Savings',
  'Self-Development',
  'Debt Payment',
  'Leisure',
  'Other Expense',
]
const PRIORITY_COLORS = ['#48a8f0', '#d11f20', '#97d852', '#64dae8', '#7f3ad4', '#f59e0b', '#22c55e']
const STORAGE_KEY = 'expense_tracker_transactions_v2'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const amountFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
})

const todayIso = () => new Date().toISOString().slice(0, 10)

const toMonthIndex = (dateValue) => {
  if (!dateValue || typeof dateValue !== 'string') {
    return null
  }

  const parts = dateValue.split('-')
  if (parts.length < 2) {
    return null
  }

  const index = Number(parts[1]) - 1
  return Number.isInteger(index) && index >= 0 && index < 12 ? index : null
}

const defaultFormState = {
  description: '',
  amount: '',
  type: 'income',
  category: INCOME_CATEGORIES[0],
  date: todayIso(),
}

const normalizeTransaction = (raw) => {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const type = raw.type === 'expense' ? 'expense' : 'income'
  const amount = Number(raw.amount)
  const description = typeof raw.description === 'string' ? raw.description.trim() : ''
  const date = typeof raw.date === 'string' && toMonthIndex(raw.date) !== null ? raw.date : todayIso()
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const category = categories.includes(raw.category) ? raw.category : categories[0]

  if (!description || Number.isNaN(amount) || amount <= 0) {
    return null
  }

  return {
    id: typeof raw.id === 'string' ? raw.id : crypto.randomUUID(),
    description,
    amount,
    type,
    category,
    date,
  }
}

const loadTransactions = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return []
    }

    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.map(normalizeTransaction).filter(Boolean)
  } catch {
    return []
  }
}

const createConicGradient = (items, total) => {
  if (!items.length || total <= 0) {
    return 'conic-gradient(#2f3b4f 0 100%)'
  }

  let current = 0
  const slices = items.map((item, index) => {
    const start = (current / total) * 100
    current += item.amount
    const end = (current / total) * 100
    return `${PRIORITY_COLORS[index % PRIORITY_COLORS.length]} ${start}% ${end}%`
  })

  return `conic-gradient(${slices.join(', ')})`
}

function App() {
  const [transactions, setTransactions] = useState(loadTransactions)
  const [selectedMonth, setSelectedMonth] = useState('ALL')
  const [searchText, setSearchText] = useState('')
  const [listTypeFilter, setListTypeFilter] = useState('all')
  const [formState, setFormState] = useState(defaultFormState)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))
  }, [transactions])

  const orderedTransactions = useMemo(() => {
    return [...transactions].sort((left, right) => {
      const dateDiff = new Date(right.date).getTime() - new Date(left.date).getTime()
      if (dateDiff !== 0) {
        return dateDiff
      }

      return right.id.localeCompare(left.id)
    })
  }, [transactions])

  const monthFilteredTransactions = useMemo(() => {
    if (selectedMonth === 'ALL') {
      return orderedTransactions
    }

    return orderedTransactions.filter((transaction) => toMonthIndex(transaction.date) === selectedMonth)
  }, [orderedTransactions, selectedMonth])

  const visibleTransactions = useMemo(() => {
    return monthFilteredTransactions.filter((transaction) => {
      const matchesType = listTypeFilter === 'all' || transaction.type === listTypeFilter
      const needle = searchText.trim().toLowerCase()
      const haystack = `${transaction.description} ${transaction.category}`.toLowerCase()
      const matchesSearch = !needle || haystack.includes(needle)
      return matchesType && matchesSearch
    })
  }, [monthFilteredTransactions, listTypeFilter, searchText])

  const summary = useMemo(() => {
    const totals = monthFilteredTransactions.reduce(
      (accumulator, transaction) => {
        if (transaction.type === 'income') {
          accumulator.income += transaction.amount
        } else {
          accumulator.expenses += transaction.amount
        }
        return accumulator
      },
      { income: 0, expenses: 0 },
    )

    return {
      income: totals.income,
      expenses: totals.expenses,
      balance: totals.income - totals.expenses,
    }
  }, [monthFilteredTransactions])

  const expensePressure = summary.income > 0 ? Math.min((summary.expenses / summary.income) * 100, 100) : 0

  const monthlySeries = useMemo(() => {
    const initial = MONTHS.map((label, index) => ({
      label,
      index,
      income: 0,
      expense: 0,
    }))

    for (const transaction of transactions) {
      const monthIndex = toMonthIndex(transaction.date)
      if (monthIndex === null) {
        continue
      }

      if (transaction.type === 'income') {
        initial[monthIndex].income += transaction.amount
      } else {
        initial[monthIndex].expense += transaction.amount
      }
    }

    return initial
  }, [transactions])

  const incomeSourceBreakdown = useMemo(() => {
    const incomeMap = new Map()

    for (const transaction of monthFilteredTransactions) {
      if (transaction.type !== 'income') {
        continue
      }

      incomeMap.set(transaction.category, (incomeMap.get(transaction.category) ?? 0) + transaction.amount)
    }

    return [...incomeMap.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((left, right) => right.amount - left.amount)
  }, [monthFilteredTransactions])

  const priorities = useMemo(() => {
    const expenseMap = new Map()

    for (const transaction of monthFilteredTransactions) {
      if (transaction.type !== 'expense') {
        continue
      }

      expenseMap.set(transaction.category, (expenseMap.get(transaction.category) ?? 0) + transaction.amount)
    }

    return [...expenseMap.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 7)
  }, [monthFilteredTransactions])

  const totalPriorities = priorities.reduce((sum, item) => sum + item.amount, 0)

  const highestIncomeMonth = monthlySeries.reduce(
    (best, entry) => (entry.income > best.income ? entry : best),
    { label: 'N/A', income: 0 },
  )

  const highestExpenseMonth = monthlySeries.reduce(
    (best, entry) => (entry.expense > best.expense ? entry : best),
    { label: 'N/A', expense: 0 },
  )

  const lineMaxValue = Math.max(
    1,
    ...monthlySeries.map((entry) => Math.max(entry.income, entry.expense)),
  )

  const graphWidth = 720
  const graphHeight = 270
  const padX = 30
  const padTop = 18
  const padBottom = 42

  const toPoint = (monthIndex, value) => {
    const usableWidth = graphWidth - padX * 2
    const usableHeight = graphHeight - padTop - padBottom
    const x = padX + (usableWidth / 11) * monthIndex
    const y = graphHeight - padBottom - (value / lineMaxValue) * usableHeight
    return `${x},${y}`
  }

  const incomePoints = monthlySeries.map((entry, index) => toPoint(index, entry.income)).join(' ')
  const expensePoints = monthlySeries.map((entry, index) => toPoint(index, entry.expense)).join(' ')

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormState((current) => ({ ...current, [name]: value }))
  }

  const handleTypeChange = (event) => {
    const nextType = event.target.value
    setFormState((current) => ({
      ...current,
      type: nextType,
      category: nextType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0],
    }))
  }

  const handleAddTransaction = (event) => {
    event.preventDefault()

    const trimmedDescription = formState.description.trim()
    const parsedAmount = Number.parseFloat(formState.amount)

    if (!trimmedDescription) {
      setErrorMessage('Please enter a description.')
      return
    }

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Amount must be a positive number.')
      return
    }

    if (toMonthIndex(formState.date) === null) {
      setErrorMessage('Please choose a valid date.')
      return
    }

    setErrorMessage('')

    const transaction = {
      id: crypto.randomUUID(),
      description: trimmedDescription,
      amount: parsedAmount,
      type: formState.type,
      category: formState.category,
      date: formState.date,
    }

    setTransactions((current) => [transaction, ...current])
    setFormState((current) => ({
      ...defaultFormState,
      type: current.type,
      category: current.type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0],
      date: todayIso(),
    }))
  }

  const deleteTransaction = (transactionId) => {
    setTransactions((current) => current.filter((transaction) => transaction.id !== transactionId))
  }

  const clearTransactions = () => {
    if (window.confirm('Delete all transactions?')) {
      setTransactions([])
    }
  }

  const sourceMax = Math.max(1, ...incomeSourceBreakdown.map((item) => item.amount))

  return (
    <main className="dashboard-app">
      <div className="dashboard-shell">
        <section className="panel title-panel">
          <p className="eyebrow">Personal Finance</p>
          <h1>Personal Money Manager Dashboard</h1>
          <p className="subhead">Track income, control expenses, and keep monthly priorities in focus.</p>
        </section>

        <section className="panel stat-panel">
          <p className="stat-label">Income</p>
          <p className="stat-value income-text">{currencyFormatter.format(summary.income)}</p>
        </section>

        <section className="panel stat-panel">
          <p className="stat-label">Needs</p>
          <p className="stat-value expense-text">{currencyFormatter.format(summary.expenses)}</p>
        </section>

        <div className="dashboard-grid">
          <aside className="panel month-panel" aria-label="Month filter">
            <div className="month-heading-row">
              <p className="month-title">Months</p>
              <button
                type="button"
                className={`tiny-filter ${selectedMonth === 'ALL' ? 'is-active' : ''}`}
                onClick={() => setSelectedMonth('ALL')}
              >
                ALL
              </button>
            </div>
            <ul className="month-list">
              {MONTHS.map((month, index) => (
                <li key={month}>
                  <button
                    type="button"
                    className={`month-pill ${selectedMonth === index ? 'is-active' : ''}`}
                    onClick={() => setSelectedMonth(index)}
                  >
                    {month}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <section className="panel account-panel" aria-label="Account summary">
            <h2>Account Summary</h2>
            <p className="panel-context">
              Showing {selectedMonth === 'ALL' ? 'all months' : MONTHS[selectedMonth]}
            </p>
            <div className="account-content">
              <div className="balance-block">
                <p className="balance-label">Balance</p>
                <p className={`balance-value ${summary.balance < 0 ? 'expense-text' : 'income-text'}`}>
                  {currencyFormatter.format(summary.balance)}
                </p>
                <div className="balance-row">
                  <div>
                    <p className="mini-label">Income</p>
                    <p className="income-text">{currencyFormatter.format(summary.income)}</p>
                  </div>
                  <div>
                    <p className="mini-label">Expenses</p>
                    <p className="expense-text">{currencyFormatter.format(summary.expenses)}</p>
                  </div>
                </div>
              </div>

              <div className="progress-wrap" aria-label="Expense pressure">
                <svg viewBox="0 0 120 120" className="progress-chart">
                  <circle cx="60" cy="60" r="48" className="progress-base" />
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    className="progress-value"
                    style={{ strokeDasharray: `${expensePressure * 3.02} 302` }}
                  />
                </svg>
                <p className="progress-text">{amountFormatter.format(expensePressure)}%</p>
                <p className="progress-caption">Expense Pressure</p>
              </div>
            </div>
          </section>

          <section className="panel source-panel" aria-label="Source of income">
            <h2>Source of Income</h2>
            {incomeSourceBreakdown.length === 0 ? (
              <p className="empty-message">No income data in this view yet.</p>
            ) : (
              <div className="source-chart">
                {incomeSourceBreakdown.map((entry) => {
                  const height = Math.max(8, (entry.amount / sourceMax) * 100)
                  return (
                    <article key={entry.category} className="bar-item">
                      <p className="bar-value">{currencyFormatter.format(entry.amount)}</p>
                      <div className="bar-track">
                        <span className="bar-fill" style={{ height: `${height}%` }} />
                      </div>
                      <p className="bar-label">{entry.category}</p>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          <section className="panel trend-panel" aria-label="Income vs expenses">
            <div className="trend-head">
              <h2>Income vs. Expenses</h2>
              <div className="trend-maxes">
                <p>
                  Max Expense <span className="expense-text">{highestExpenseMonth.label}</span>
                </p>
                <p>
                  Max Income <span className="income-text">{highestIncomeMonth.label}</span>
                </p>
              </div>
            </div>

            <div className="trend-legend">
              <span className="legend-item"><i className="legend-dot income-dot" /> Income</span>
              <span className="legend-item"><i className="legend-dot expense-dot" /> Expenses</span>
            </div>

            <div className="trend-svg-wrap">
              <svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} className="trend-svg">
                {[0, 1, 2, 3, 4].map((step) => {
                  const value = (lineMaxValue / 4) * step
                  const y = graphHeight - padBottom - ((graphHeight - padTop - padBottom) / 4) * step
                  return (
                    <g key={step}>
                      <line x1={padX} y1={y} x2={graphWidth - padX} y2={y} className="grid-line" />
                      <text x={4} y={y + 4} className="grid-text">
                        {amountFormatter.format(value)}
                      </text>
                    </g>
                  )
                })}

                <polyline points={incomePoints} className="income-line" />
                <polyline points={expensePoints} className="expense-line" />

                {monthlySeries.map((entry, index) => (
                  <circle
                    key={`income-${entry.label}`}
                    cx={toPoint(index, entry.income).split(',')[0]}
                    cy={toPoint(index, entry.income).split(',')[1]}
                    r="4"
                    className="income-point"
                  />
                ))}

                {monthlySeries.map((entry, index) => (
                  <circle
                    key={`expense-${entry.label}`}
                    cx={toPoint(index, entry.expense).split(',')[0]}
                    cy={toPoint(index, entry.expense).split(',')[1]}
                    r="4"
                    className="expense-point"
                  />
                ))}
              </svg>

              <div className="trend-months">
                {MONTHS.map((month) => (
                  <span key={month}>{month}</span>
                ))}
              </div>
            </div>
          </section>

          <section className="panel priorities-panel" aria-label="Financial priorities">
            <h2>Financial Priorities</h2>
            <div className="priorities-top">
              <div className="priority-ring" style={{ backgroundImage: createConicGradient(priorities, totalPriorities) }}>
                <span>{totalPriorities > 0 ? 'Top Expenses' : 'No Data'}</span>
              </div>
            </div>
            {priorities.length === 0 ? (
              <p className="empty-message">Add expense transactions to see priority split.</p>
            ) : (
              <ul className="priority-list">
                {priorities.map((entry, index) => (
                  <li key={entry.category}>
                    <span className="priority-meta">
                      <i style={{ backgroundColor: PRIORITY_COLORS[index % PRIORITY_COLORS.length] }} />
                      {entry.category}
                    </span>
                    <strong>{currencyFormatter.format(entry.amount)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel form-panel" aria-label="Transaction input form">
            <h2>Add Transaction</h2>
            <form className="transaction-form" onSubmit={handleAddTransaction}>
              <label>
                Description
                <input
                  type="text"
                  name="description"
                  value={formState.description}
                  onChange={handleInputChange}
                  placeholder="Salary, Groceries, Insurance, etc."
                  required
                />
              </label>

              <div className="form-row">
                <label>
                  Amount
                  <input
                    type="number"
                    name="amount"
                    min="0.01"
                    step="0.01"
                    value={formState.amount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    required
                  />
                </label>

                <label>
                  Type
                  <select name="type" value={formState.type} onChange={handleTypeChange}>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label>
                  Category
                  <select name="category" value={formState.category} onChange={handleInputChange}>
                    {(formState.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Date
                  <input type="date" name="date" value={formState.date} onChange={handleInputChange} required />
                </label>
              </div>

              {errorMessage && <p className="form-error">{errorMessage}</p>}

              <button type="submit" className="primary-btn">
                Add Transaction
              </button>
            </form>
          </section>

          <section className="panel transactions-panel" aria-label="Transaction list">
            <div className="transaction-head">
              <h2>Transactions</h2>
              <button type="button" className="ghost-btn" onClick={clearTransactions} disabled={transactions.length === 0}>
                Clear All
              </button>
            </div>

            <div className="transaction-filters">
              <input
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search by description or category"
              />
              <select value={listTypeFilter} onChange={(event) => setListTypeFilter(event.target.value)}>
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            {visibleTransactions.length === 0 ? (
              <p className="empty-message">No matching transactions in this view.</p>
            ) : (
              <ul className="transaction-list">
                {visibleTransactions.map((transaction) => (
                  <li key={transaction.id} className="transaction-item">
                    <div className="transaction-main">
                      <p className="transaction-desc">{transaction.description}</p>
                      <p className="transaction-meta">
                        {transaction.category} | {transaction.date}
                      </p>
                    </div>

                    <div className="transaction-side">
                      <p className={transaction.type === 'income' ? 'income-text' : 'expense-text'}>
                        {transaction.type === 'income' ? '+' : '-'}
                        {currencyFormatter.format(transaction.amount)}
                      </p>
                      <button
                        type="button"
                        className="icon-delete"
                        onClick={() => deleteTransaction(transaction.id)}
                        aria-label={`Delete ${transaction.description}`}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

export default App