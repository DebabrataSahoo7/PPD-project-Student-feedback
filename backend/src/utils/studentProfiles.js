import { createError } from '../middleware/errorHandler.js';

export async function getStudentAcademicContext(db, userId) {
  const { rows } = await db.query(
    `SELECT sas.user_id, sas.programme_id, sas.branch_id, sas.current_semester, sas.section, sas.academic_year,
            sp.admission_year
     FROM student_academic_status sas
     LEFT JOIN student_profiles sp ON sp.user_id = sas.user_id
     WHERE sas.user_id = $1`,
    [userId]
  );
  return rows[0] ?? null;
}

export function matchesStudentAcademicForm(context, form) {
  return Boolean(
    context &&
    form.mode === 'academic' &&
    context.programme_id === form.programme_id &&
    context.branch_id === form.branch_id &&
    Number(context.current_semester) === Number(form.semester) &&
    context.academic_year === form.academic_year
  );
}

export async function requireEligibleStudentForAcademicForm(db, user, form) {
  if (!user) {
    throw createError(401, 'UNAUTHORIZED', 'Login required to access this academic form');
  }

  if (user.role === 'admin' || user.role === 'faculty') {
    return null;
  }

  if (user.role !== 'student') {
    throw createError(403, 'FORBIDDEN', 'Only students can access academic feedback forms through the public link');
  }

  const context = await getStudentAcademicContext(db, user.id);
  if (!context) {
    throw createError(403, 'STUDENT_PROFILE_INCOMPLETE', 'Your student academic status is incomplete');
  }
  if (!matchesStudentAcademicForm(context, form)) {
    throw createError(403, 'FORM_NOT_AVAILABLE', 'This form is not available for your academic context');
  }

  return context;
}
