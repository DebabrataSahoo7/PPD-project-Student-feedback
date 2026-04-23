/**
 * Built-in form templates.
 * Each template defines a list of questions with default dimensions.
 * These are seeded into a form when the admin picks a template.
 */

export const TEMPLATES = {
  faculty_feedback: {
    name: 'Academic CO Form',
    description: 'Student feedback on faculty — includes CO mapping and dimension tagging for NBA/NAAC attainment reporting.',
    questions: [
      { text: 'Has the teacher covered relevant topics beyond the syllabus?',  dimension: 'delivery',    type: 'grid', required: true },
      { text: 'Effectiveness of the teacher in terms of Communication Skills',  dimension: 'theory',      type: 'grid', required: true },
      { text: 'Effectiveness in terms of use of teaching aids',                 dimension: 'delivery',    type: 'grid', required: true },
      { text: 'Pace at which contents were covered',                            dimension: 'delivery',    type: 'grid', required: true },
      { text: 'Motivation and inspiration for students to learn',               dimension: 'engagement',  type: 'grid', required: true },
      { text: 'Motivation — Practical Demonstration',                           dimension: 'practical',   type: 'grid', required: true },
      { text: 'Motivation — Hands-on Training',                                 dimension: 'practical',   type: 'grid', required: true },
      { text: 'Clarity of expectation of students',                             dimension: 'delivery',    type: 'grid', required: true },
      { text: 'Willingness to offer help and advice',                           dimension: 'engagement',  type: 'grid', required: true },
    ],
  },
  campus_facility: {
    name: 'Campus Facility Survey',
    description: 'General feedback on college infrastructure, laboratories, and maintenance.',
    questions: [
      { text: 'How satisfied are you with the overall cleanliness of the campus?', type: 'rating', required: true },
      { text: 'Rate the quality of Wi-Fi and internet connectivity across campus.', type: 'linear_scale', required: true },
      { text: 'Rate the condition and adequacy of laboratory equipment.', type: 'rating', required: true },
      { text: 'How satisfied are you with library facilities and study spaces?', type: 'linear_scale', required: true },
      { text: 'Any suggestions for improving campus facilities?', type: 'long_text', required: false },
    ],
  },
};
