/**
 * ONE-TIME SETUP ROUTE
 * POST /api/v1/setup/seed
 *
 * Runs the seed script against the live database.
 * Protected by SETUP_SECRET env var.
 * Safe to call multiple times — uses upserts.
 *
 * DELETE THIS FILE after seeding is complete.
 */

import { Router } from 'express';
import pg from 'pg';
import bcrypt from 'bcrypt';

const { Client } = pg;
const router = Router();

const PROGRAMME_NAME = 'B.Tech';
const BRANCH_NAMES = ['Computer Science Engineering', 'Information Technology', 'Civil Engineering'];

const FACULTY_SEED = [
  { name: 'Dr. Stithapragyan Mohanty',   designation: 'Lecturer',                  email: 'sthitapragyanit@outr.ac.in', phone: '7008965600' },
  { name: 'Mr. Debi Prasad Mishra',       designation: 'Lecturer',                  email: 'dpmishrait@outr.ac.in',      phone: '9438435574' },
  { name: 'Dr. Ranjan Kumar Dash',        designation: 'Asso. Professor & HOD',     email: 'rkdas@outr.ac.in',           phone: '9437360517' },
  { name: 'Mr. Sanjit Kumar Dash',        designation: 'Lecturer',                  email: 'skdash@outr.ac.in',          phone: '9437990832' },
  { name: 'Mrs. Jayshree Dev',            designation: 'Lecturer',                  email: 'jdevit@outr.ac.in',          phone: '9437106071' },
  { name: 'Mr. J. Chandrakanta Badjena',  designation: 'Lecturer',                  email: 'chandrakantait@outr.ac.in',  phone: '9437851274' },
  { name: 'Mrs. Rajalaxmi Padhy',         designation: 'Lecturer',                  email: 'rpadhyit@outr.ac.in',        phone: '9439955322' },
  { name: 'Ms. Swati Lipsa',              designation: 'Lecturer',                  email: 'slipsait@outr.ac.in',        phone: '9438349394' },
  { name: 'Mrs. Rupa Madhuri Patanaik',   designation: 'Lecturer',                  email: 'rmpatnaik@outr.ac.in',       phone: '9438051444' },
  { name: 'Ms. Shatabdinilini',           designation: 'Lecturer',                  email: 'snaliniit@outr.ac.in',       phone: '9437665825' },
];

const IT_SEM6_SUBJECTS = [
  { short_code: 'CS3102', name: 'Deep Learning', semester: 6, cos: [
    'Understand fundamentals of deep learning',
    'Learn architectures and optimization methods',
    'Implement models using TensorFlow',
    'Evaluate and build new DL applications',
  ]},
  { short_code: 'CS3104', name: 'Compiler Design', semester: 6, cos: [
    'Understand lexical analysis and tokenization',
    'Analyze syntax and semantic processing',
    'Implement intermediate code generation',
    'Analyze optimization and code generation',
  ]},
  { short_code: 'CS3202', name: 'Data Mining', semester: 6, cos: [
    'Understand data mining concepts and association rules',
    'Learn classification and clustering techniques',
    'Analyze data mining systems critically',
    'Apply data mining technologies practically',
  ]},
  { short_code: 'BH3403', name: 'Entrepreneurship Development', semester: 6, cos: [
    'Exemplifying the business opportunities, social responsibilities and the support system for setting up an enterprise.',
    'Determining stages of Entrepreneurial Process starting from idea generation, developing a business plan and operational aspects of an Enterprise.',
    'Appraising the different funding options and Financial Management of an enterprise.',
    'Assessing the Start-up management practices like incubation, mentorship and Government initiatives.',
  ]},
  { short_code: 'CS3206', name: 'Computer Vision', semester: 6, cos: [
    'Apply transforms like Fourier, DCT, and Wavelet for image representation and analysis',
    'Perform image pre processing using smoothing, edge, and corner detection.',
    'Implement segmentation and recognition using SIFT, RANSAC, and Random Forests.',
    'Analyze 3D scenes using projective geometry and epipolar constraints.',
  ]},
  { short_code: 'IP3403', name: 'Industrial Safety Engineering', semester: 6, cos: [
    'Apply safety principles in various work environments, especially in construction and machine operations.',
    'Identify safety hazards, implement safety measures.',
    'Analyse risks to prevent accidents and injuries.',
    'Understand safety protocols, policies, and the responsibilities of individuals and organizations.',
  ]},
];

router.post('/seed', async (req, res) => {
  const secret = req.headers['x-setup-secret'];
  if (!secret || secret !== process.env.SETUP_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const log = [];

  try {
    await client.connect();
    log.push('Connected');

    // Programme
    const { rows: [prog] } = await client.query(
      `INSERT INTO programmes (name) VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id, name`,
      [PROGRAMME_NAME]
    );
    log.push(`Programme: ${prog.name}`);

    // Branches
    const branchMap = {};
    for (const name of BRANCH_NAMES) {
      const { rows: [b] } = await client.query(
        `INSERT INTO branches (programme_id, name) VALUES ($1, $2)
         ON CONFLICT (programme_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id, name`,
        [prog.id, name]
      );
      branchMap[b.name] = b.id;
      log.push(`Branch: ${b.name}`);
    }

    const itId = branchMap['Information Technology'];

    // Subjects + COs
    for (const [i, subj] of IT_SEM6_SUBJECTS.entries()) {
      const { rows: [s] } = await client.query(
        `INSERT INTO subjects (branch_id, semester, name, short_code, order_index)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (branch_id, semester, short_code)
         DO UPDATE SET name = EXCLUDED.name, order_index = EXCLUDED.order_index
         RETURNING id, name, short_code`,
        [itId, subj.semester, subj.name, subj.short_code, i + 1]
      );
      log.push(`Subject: ${s.short_code} - ${s.name}`);

      for (const [ci, desc] of subj.cos.entries()) {
        const coCode = `${subj.short_code}-CO${ci + 1}`;
        await client.query(
          `INSERT INTO course_outcomes (subject_id, co_code, description, order_index)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (subject_id, co_code)
           DO UPDATE SET description = EXCLUDED.description, order_index = EXCLUDED.order_index`,
          [s.id, coCode, desc, ci + 1]
        );
        log.push(`  CO: ${coCode}`);
      }
    }

    // Faculty
    const newCreds = [];
    for (const f of FACULTY_SEED) {
      const existing = await client.query(`SELECT id FROM users WHERE email = $1`, [f.email]);
      if (existing.rowCount > 0) {
        await client.query(
          `UPDATE users SET name=$1, designation=$2, phone=$3 WHERE email=$4`,
          [f.name, f.designation, f.phone, f.email]
        );
        log.push(`Faculty refreshed: ${f.email}`);
      } else {
        const tempPwd = f.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) + '123!';
        const hash = await bcrypt.hash(tempPwd, 12);
        await client.query(
          `INSERT INTO users (name, email, designation, phone, password_hash, role, must_change_password)
           VALUES ($1, $2, $3, $4, $5, 'faculty', true)`,
          [f.name, f.email, f.designation, f.phone, hash]
        );
        newCreds.push({ email: f.email, temp_password: tempPwd });
        log.push(`Faculty created: ${f.email} (pwd: ${tempPwd})`);
      }
    }

    res.json({ success: true, log, new_faculty_credentials: newCreds });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, log });
  } finally {
    await client.end();
  }
});

export default router;
