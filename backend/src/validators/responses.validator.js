import { z } from 'zod';

const gridValueSchema = z.object({
  question_row_id: z.string().uuid(),
  value:           z.number().int(),
});

const answerSchema = z.object({
  question_id:        z.string().uuid(),
  text_value:         z.string().nullable().optional(),
  numeric_value:      z.number().nullable().optional(),
  date_value:         z.string().nullable().optional(),
  grid_values:        z.array(gridValueSchema).optional().default([]),
  selected_option_ids: z.array(z.string().uuid()).optional().default([]),
});

export const submitResponseSchema = z.object({
  respondent_name:  z.string().max(150).nullable().optional(),
  respondent_email: z.string().email().nullable().optional(),
  answers:          z.array(answerSchema).min(1),
});
