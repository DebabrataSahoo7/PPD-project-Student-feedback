import { z } from 'zod';

export const registerSchema = z.object({
  name:     z.string().min(1).max(150),
  email:    z.string().email(),
  password: z.string().min(6),
  role:     z.enum(['admin', 'faculty', 'student']),
  registration_number: z.string().max(50).optional().nullable(),
  programme_id: z.string().uuid().optional().nullable(),
  branch_id: z.string().uuid().optional().nullable(),
  current_semester: z.number().int().min(1).max(12).optional().nullable(),
  section: z.string().max(20).optional().nullable(),
  admission_year: z.number().int().min(1900).max(9999).optional().nullable(),
  academic_year: z.string().max(20).optional().nullable(),
});

export const loginSchema = z.object({
  identifier: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
  password: z.string().min(1),
}).refine((data) => Boolean(data.identifier || data.email), {
  message: 'identifier is required',
  path: ['identifier'],
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password:     z.string().min(6),
});
