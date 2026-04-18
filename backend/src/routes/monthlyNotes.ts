import { Router } from 'express';
import { asyncHandler, NotFoundError } from '../middleware/errorHandler';
import pool from '../db/client';

const router = Router();

interface NoteRow {
  id: number;
  month: string;
  note: string;
  created_at: string;
  updated_at: string;
}

function formatNote(row: NoteRow) {
  return {
    id: row.id,
    month: row.month,
    note: row.note,
  };
}

// GET /notes/:month — get note for month (YYYY-MM-DD format, first of month)
router.get(
  '/:month',
  asyncHandler(async (req, res) => {
    const month = req.params.month;
    const result = await pool.query<NoteRow>(
      'SELECT * FROM monthly_notes WHERE month = $1',
      [month]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError(`No note found for month ${month}`);
    }

    res.json({ data: formatNote(result.rows[0]) });
  })
);

// POST /notes/:month — create note
router.post(
  '/:month',
  asyncHandler(async (req, res) => {
    const month = req.params.month;
    const { note } = req.body;

    const result = await pool.query<NoteRow>(
      `INSERT INTO monthly_notes (month, note) VALUES ($1, $2) RETURNING *`,
      [month, note]
    );

    res.status(201).json({ data: formatNote(result.rows[0]) });
  })
);

// PUT /notes/:month — update note
router.put(
  '/:month',
  asyncHandler(async (req, res) => {
    const month = req.params.month;
    const { note } = req.body;

    const result = await pool.query<NoteRow>(
      `UPDATE monthly_notes SET note = $1, updated_at = NOW() WHERE month = $2 RETURNING *`,
      [note, month]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError(`No note found for month ${month}`);
    }

    res.json({ data: formatNote(result.rows[0]) });
  })
);

export default router;
