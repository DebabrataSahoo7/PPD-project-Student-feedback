import { z } from 'zod';

const studentAcademicSchema = {
  programme: z.string().max(200).nullable().optional(),
  branch: z.string().max(200).nullable().optional(),
  programme_id: z.string().uuid().nullable().optional(),
  branch_id: z.string().uuid().nullable().optional(),
  current_semester: z.number().int().min(1).max(12).nullable().optional(),
  section: z.string().max(20).nullable().optional(),
  academic_year: z.string().max(20).nullable().optional(),
  admission_year: z.number().int().min(1900).max(9999).nullable().optional(),
  source_row: z.number().int().positive().nullable().optional(),
};

const optionalFacultyProfileSchema = {
  designation: z.string().max(150).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
};

export const createFacultySchema = z.object({
  name: z.string().min(1).max(150),
  email: z.string().email(),
  designation: z.string().max(150).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
});

export const importUsersSchema = z.object({
  users: z.array(z.object({
    name:                z.string().min(1).max(150),
    email:               z.union([z.string().email(), z.literal(''), z.null()]).optional(),
    registration_number: z.string().max(50).nullable().optional(),
    role:                z.enum(['faculty', 'student']),
    ...optionalFacultyProfileSchema,
    ...studentAcademicSchema,
  })).min(1),
});

export const updateUserSchema = z.object({
  name:                z.string().min(1).max(150).optional(),
  email:               z.string().email().optional(),
  registration_number: z.string().max(50).nullable().optional(),
  is_active:           z.boolean().optional(),
  ...optionalFacultyProfileSchema,
  ...studentAcademicSchema,
});
