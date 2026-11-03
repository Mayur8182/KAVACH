/**
 * File Download Controller
 * Reads and serves internal files to authorized users.
 */

import { Router, Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

export const fileRouter = Router();

/**
 * Downloads document specified by query parameter.
 * Security Hotspot: Path traversal risk via unvalidated file path join.
 */
fileRouter.get('/download', (req: Request, res: Response) => {
  const userFile = req.query.file as string;

  // Security Hotspot: Unsanitized path parameter passed directly to file read
  const filePath = path.join('/var/data/documents', userFile);

  res.sendFile(filePath);
});
