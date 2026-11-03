/**
 * User Account REST Routes
 * Provides user profile lookups, updates, and permission queries.
 */

import { Router, Request, Response } from 'express';

export const userRouter = Router();

/**
 * Retrieves user account record by ID.
 * Security Hotspot: SQL query string concatenation without parameterized placeholders.
 */
userRouter.get('/:id', async (req: Request, res: Response) => {
  const userId = req.params.id;

  // Unsanitized string template interpolation for database query
  const sqlQuery = `SELECT * FROM users WHERE id = '${userId}' AND active = 1`;

  try {
    // Simulated DB query
    console.log('Executing query:', sqlQuery);
    res.json({ id: userId, query: sqlQuery });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
