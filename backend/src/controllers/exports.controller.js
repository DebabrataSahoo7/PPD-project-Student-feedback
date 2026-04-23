import { query } from '../db/pool.js';
import { createError } from '../middleware/errorHandler.js';
import { stringify } from 'csv-stringify';
import PDFDocument from 'pdfkit';

// ── GET /forms/:id/export/csv ─────────────────────────────────
export async function exportCSV(req, res, next) {
  try {
    const { id: formId } = req.params;

    const formCheck = await query('SELECT id, title FROM forms WHERE id = $1', [formId]);
    if (formCheck.rowCount === 0) return next(createError(404, 'FORM_NOT_FOUND', 'Form not found'));

    const { rows: responses } = await query(
      `SELECT r.id, r.submitted_at, r.respondent_name, r.respondent_email,
              a.text_value, a.numeric_value, a.date_value,
              q.text AS question_text, q.type AS question_type
       FROM responses r
       JOIN answers a ON a.response_id = r.id
       JOIN questions q ON q.id = a.question_id
       WHERE r.form_id = $1
       ORDER BY r.submitted_at, q.order_index`,
      [formId]
    );

    // Build answer string per row
    const rows = responses.map(r => ({
      response_id:      r.id,
      submitted_at:     r.submitted_at,
      respondent_name:  r.respondent_name  ?? '',
      respondent_email: r.respondent_email ?? '',
      question_text:    r.question_text,
      question_type:    r.question_type,
      answer:           r.text_value ?? r.numeric_value ?? r.date_value ?? '',
    }));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="responses-${formId}.csv"`);

    stringify(rows, { header: true }, (err, output) => {
      if (err) return next(err);
      res.send(output);
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /forms/:id/export/pdf ─────────────────────────────────
export async function exportPDF(req, res, next) {
  try {
    const { id: formId } = req.params;

    const { rows: formRows } = await query(
      `SELECT id, title, mode, starts_at, ends_at FROM forms WHERE id = $1`,
      [formId]
    );
    if (formRows.length === 0) return next(createError(404, 'FORM_NOT_FOUND', 'Form not found'));
    const form = formRows[0];

    if (form.mode !== 'academic') {
      return next(createError(400, 'NOT_ACADEMIC', 'PDF export is only available for academic forms'));
    }

    const { rows: [{ total }] } = await query(
      'SELECT COUNT(*)::int AS total FROM responses WHERE form_id = $1',
      [formId]
    );

    const { rows: coResults } = await query(
      `SELECT car.avg_score, car.percentage, car.level,
              co.co_code, co.description,
              s.name AS subject_name, s.short_code
       FROM co_attainment_results car
       JOIN course_outcomes co ON co.id = car.co_id
       JOIN subjects s ON s.id = car.subject_id
       WHERE car.form_id = $1
       ORDER BY s.order_index, co.order_index`,
      [formId]
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="co-report-${formId}.pdf"`);

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    // Title
    doc.fontSize(18).font('Helvetica-Bold').text(form.title, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica')
      .text(`Date range: ${form.starts_at ? new Date(form.starts_at).toDateString() : 'N/A'} → ${form.ends_at ? new Date(form.ends_at).toDateString() : 'N/A'}`, { align: 'center' })
      .text(`Total responses: ${total}`, { align: 'center' });
    doc.moveDown(1);

    if (coResults.length === 0) {
      doc.text('CO attainment has not been computed yet.');
    } else {
      doc.fontSize(13).font('Helvetica-Bold').text('CO Attainment Results');
      doc.moveDown(0.5);

      // Table header
      const cols = [120, 60, 160, 60, 70, 70];
      const headers = ['Subject', 'CO Code', 'Description', 'Avg', '%', 'Level'];
      let x = doc.page.margins.left;
      doc.fontSize(9).font('Helvetica-Bold');
      headers.forEach((h, i) => { doc.text(h, x, doc.y, { width: cols[i], continued: i < headers.length - 1 }); x += cols[i]; });
      doc.moveDown(0.3);
      doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
      doc.moveDown(0.3);

      doc.font('Helvetica').fontSize(8);
      for (const r of coResults) {
        x = doc.page.margins.left;
        const rowY = doc.y;
        const cells = [r.subject_name, r.co_code, r.description, String(r.avg_score), `${r.percentage}%`, r.level];
        cells.forEach((c, i) => {
          doc.text(c, x, rowY, { width: cols[i], continued: i < cells.length - 1 });
          x += cols[i];
        });
        doc.moveDown(0.4);
      }
    }

    doc.end();
  } catch (err) {
    next(err);
  }
}
