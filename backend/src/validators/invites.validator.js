import { z } from 'zod';

export const sendInvitesSchema = z.object({
  emails: z.array(z.string().email()).min(1),
});
