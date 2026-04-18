import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';

import healthRouter from './routes/health';
import incomeRouter from './routes/income';
import expensesRouter from './routes/expenses';
import loansRouter from './routes/loans';
import investmentsRouter from './routes/investments';
import savingsRouter from './routes/savings';
import dashboardRouter from './routes/dashboard';
import dataManagementRouter from './routes/dataManagement';
import monthlyNotesRouter from './routes/monthlyNotes';

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

// Health check (outside /api/v1)
app.use('/health', healthRouter);

// API v1 routes
app.use('/api/v1/income', incomeRouter);
app.use('/api/v1/expenses', expensesRouter);
app.use('/api/v1/loans', loansRouter);
app.use('/api/v1/investments', investmentsRouter);
app.use('/api/v1/savings', savingsRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/data', dataManagementRouter);
app.use('/api/v1/notes', monthlyNotesRouter);

// Root API info
app.get('/api/v1', (_req, res) => {
  res.json({ data: { message: 'Portfolio Tracker API v1' } });
});

app.use(errorHandler);

export default app;
