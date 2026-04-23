import { z } from 'zod';

export const createBranchSchema = z.object({
  programme_id: z.string().uuid('Invalid programme ID'),
  name: z.string().min(1, 'Branch name is required').max(200)
});
