import { z } from 'zod';

export const createSubjectSchema = z.object({
  branch_id: z.string().uuid('Invalid branch ID'),
  semester: z.number().min(1).max(12),
  name: z.string().min(1, 'Name is required').max(200),
  short_code: z.string().min(1, 'Short code is required').max(20),
  order_index: z.number().optional()
});

export const updateSubjectSchema = z.object({
  name: z.string().max(200).optional(),
  short_code: z.string().max(20).optional(),
  order_index: z.number().optional()
});

export const assignFacultySchema = z.object({
  faculty_id: z.string().uuid('Invalid faculty ID')
});

export const createCOSchema = z.object({
  co_code: z.string().min(1).max(20),
  description: z.string().min(1),
  order_index: z.number().optional()
});

export const updateCOSchema = z.object({
  co_code: z.string().max(20).optional(),
  description: z.string().optional(),
  order_index: z.number().optional()
});
