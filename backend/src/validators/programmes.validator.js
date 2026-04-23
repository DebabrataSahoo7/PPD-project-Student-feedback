import { z } from 'zod';

export const createProgrammeSchema = z.object({
  name: z.string().min(1, 'Programme name is required').max(200)
});
