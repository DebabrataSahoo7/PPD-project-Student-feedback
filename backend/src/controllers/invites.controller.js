import { query } from '../db/pool.js';
import { createError } from '../middleware/errorHandler.js';
import { sendMail } from '../utils/mailer.js';

// ── POST /forms/:id/invites ───────────────────────────────────
export async function sendInvites(req, res, next) {
  try {
    const { id: formId } = req.params;
    const { emails } = req.body;

    const { rows: formRows } = await query(
      'SELECT id, title, share_token FROM forms WHERE id = $1',
      [formId]
    );
    if (formRows.length === 0) return next(createError(404, 'FORM_NOT_FOUND', 'Form not found'));
    const form = formRows[0];

    const baseUrl   = process.env.APP_BASE_URL || 'http://localhost:3000';
    const shareLink = `${baseUrl}/f/${form.share_token}`;

    let sent = 0, skipped = 0;

    for (const email of emails) {
      // Skip if already invited
      const dup = await query(
        'SELECT id FROM email_invites WHERE form_id = $1 AND email = $2',
        [formId, email]
      );
      if (dup.rowCount > 0) { skipped++; continue; }

      await query(
        'INSERT INTO email_invites (form_id, email) VALUES ($1, $2)',
        [formId, email]
      );

      try {
        await sendMail({
          to:      email,
          subject: `You're invited: ${form.title}`,
          html:    `<p>You have been invited to fill out a feedback form.</p>
                    <p><a href="${shareLink}">Click here to respond</a></p>`,
        });
        sent++;
      } catch {
        // Email send failed — invite row still created, count as skipped
        skipped++;
      }
    }

    res.json({ sent, skipped, message: 'Invites sent' });
  } catch (err) {
    next(err);
  }
}

// ── POST /forms/:id/invites/remind ────────────────────────────
export async function sendReminders(req, res, next) {
  try {
    const { id: formId } = req.params;

    const { rows: formRows } = await query(
      'SELECT id, title, share_token FROM forms WHERE id = $1',
      [formId]
    );
    if (formRows.length === 0) return next(createError(404, 'FORM_NOT_FOUND', 'Form not found'));
    const form = formRows[0];

    // Pending invitees who haven't responded and haven't received a reminder
    const { rows: pending } = await query(
      `SELECT id, email FROM email_invites
       WHERE form_id = $1 AND responded = false AND reminder_sent_at IS NULL`,
      [formId]
    );

    const baseUrl   = process.env.APP_BASE_URL || 'http://localhost:3000';
    const shareLink = `${baseUrl}/f/${form.share_token}`;
    let reminders_sent = 0;

    for (const inv of pending) {
      try {
        await sendMail({
          to:      inv.email,
          subject: `Reminder: ${form.title}`,
          html:    `<p>This is a reminder to fill out the feedback form before the deadline.</p>
                    <p><a href="${shareLink}">Click here to respond</a></p>`,
        });
        await query(
          'UPDATE email_invites SET reminder_sent_at = NOW() WHERE id = $1',
          [inv.id]
        );
        reminders_sent++;
      } catch {
        // Non-fatal
      }
    }

    res.json({ reminders_sent, message: 'Reminders sent' });
  } catch (err) {
    next(err);
  }
}

// ── GET /forms/:id/invites ────────────────────────────────────
export async function listInvites(req, res, next) {
  try {
    const { id: formId } = req.params;

    const formCheck = await query('SELECT id FROM forms WHERE id = $1', [formId]);
    if (formCheck.rowCount === 0) return next(createError(404, 'FORM_NOT_FOUND', 'Form not found'));

    const { rows } = await query(
      `SELECT email, sent_at, reminder_sent_at, responded
       FROM email_invites WHERE form_id = $1 ORDER BY sent_at DESC`,
      [formId]
    );

    const total_invited = rows.length;
    const responded     = rows.filter(r => r.responded).length;
    const pending       = total_invited - responded;

    res.json({ total_invited, responded, pending, data: rows });
  } catch (err) {
    next(err);
  }
}
