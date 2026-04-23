import { z } from 'zod';

const dimensionEnum = z.enum(['theory', 'delivery', 'practical', 'engagement', 'assessment']);

// ── Section 7: Dimension Mapping ─────────────────────────────
export const dimensionMappingSchema = z.object({
  mappings: z.array(z.object({
    dimension: dimensionEnum,
    co_id:     z.string().uuid(),
  })).min(1),
});

// ── Section 8: Forms ─────────────────────────────────────────
export const createFormSchema = z.object({
  title:                    z.string().min(1).max(300),
  description:              z.string().optional().nullable(),
  mode:                     z.enum(['academic', 'simple']),
  programme_id:             z.string().uuid().optional().nullable(),
  branch_id:                z.string().uuid().optional().nullable(),
  semester:                 z.number().min(1).max(12).optional().nullable(),
  academic_year:            z.string().max(20).optional().nullable(),
  is_anonymous:             z.boolean().optional().default(false),
  require_login:            z.boolean().optional().default(false),
  allow_multiple_responses: z.boolean().optional().default(false),
  starts_at:                z.string().optional().nullable(),
  ends_at:                  z.string().optional().nullable(),
});

export const updateFormSchema = createFormSchema.partial();

// ── Section 9: Questions ─────────────────────────────────────
const rowSchema = z.object({
  label:       z.string().min(1).max(200),
  subject_id:  z.string().uuid().optional().nullable(),
  order_index: z.number().int().min(0).optional().default(0),
});

const optionSchema = z.object({
  label:       z.string().min(1).max(300),
  order_index: z.number().int().min(0).optional().default(0),
});

export const createQuestionSchema = z.object({
  order_index:  z.number().int().min(0).optional().default(0),
  text:         z.string().optional().default(''),
  type:         z.enum(['grid','rating','short_text','long_text','mcq','checkbox','dropdown','linear_scale','date']),
  required:     z.boolean().optional().default(true),
  dimension:    dimensionEnum.optional().nullable(),
  scale_min:    z.number().int().optional().nullable(),
  scale_max:    z.number().int().optional().nullable(),
  scale_labels: z.record(z.string(), z.string()).optional().nullable(),
  rows:         z.array(rowSchema).optional().default([]),
  options:      z.array(optionSchema).optional().default([]),
});

export const updateQuestionSchema = createQuestionSchema.partial();

export const reorderQuestionsSchema = z.object({
  order: z.array(z.string().uuid()).min(1),
});
