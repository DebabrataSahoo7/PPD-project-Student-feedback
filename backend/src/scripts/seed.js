/**
 * seed.js
 *
 * Seeds only the core academic master data needed for the project:
 * - admin account is expected to be created by init-db via ADMIN_EMAIL / ADMIN_PASSWORD
 * - programme: B.Tech
 * - branches: CSE, IT, Civil
 * - subjects + COs for IT semester 6
 *
 * Also seeds faculty accounts for the IT department without assigning subjects.
 *
 * Intentionally does NOT seed:
 * - students
 * - subject_faculty assignments
 * - dimension mappings
 * - demo forms or responses
 */
import 'dotenv/config';
import pg from 'pg';
import bcrypt from 'bcrypt';

const { Client } = pg;

const client = new Client(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl:
          process.env.DATABASE_URL.includes('railway') ||
          process.env.DATABASE_URL.includes('neon') ||
          process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'sfc_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
      }
);

const PROGRAMME_NAME = 'B.Tech';

const BRANCH_NAMES = [
  'Computer Science Engineering',
  'Information Technology',
  'Civil Engineering',
];

const FACULTY_SEED = [
  { name: 'Dr. Stithapragyan Mohanty', designation: 'Lecturer', email: 'sthitapragyanit@outr.ac.in', phone: '7008965600' },
  { name: 'Mr. Debi Prasad Mishra', designation: 'Lecturer', email: 'dpmishrait@outr.ac.in', phone: '9438435574' },
  { name: 'Dr. Ranjan Kumar Dash', designation: 'Asso. Professor & HOD', email: 'rkdas@outr.ac.in', phone: '9437360517' },
  { name: 'Mr. Sanjit Kumar Dash', designation: 'Lecturer', email: 'skdash@outr.ac.in', phone: '9437990832' },
  { name: 'Mrs. Jayshree Dev', designation: 'Lecturer', email: 'jdevit@outr.ac.in', phone: '9437106071' },
  { name: 'Mr. J. Chandrakanta Badjena', designation: 'Lecturer', email: 'chandrakantait@outr.ac.in', phone: '9437851274' },
  { name: 'Mrs. Rajalaxmi Padhy', designation: 'Lecturer', email: 'rpadhyit@outr.ac.in', phone: '9439955322' },
  { name: 'Ms. Swati Lipsa', designation: 'Lecturer', email: 'slipsait@outr.ac.in', phone: '9438349394' },
  { name: 'Mrs. Rupa Madhuri Patanaik', designation: 'Lecturer', email: 'rmpatnaik@outr.ac.in', phone: '9438051444' },
  { name: 'Ms. Shatabdinilini', designation: 'Lecturer', email: 'snaliniit@outr.ac.in', phone: '9437665825' },
];

const SALT_ROUNDS = 12;

function facultyTempPassword(email) {
  const localPart = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'faculty';
  return `${localPart}123!`;
}

const IT_SEM6_SUBJECTS = [
  {
    short_code: 'CS3102',
    name: 'Deep Learning',
    semester: 6,
    cos: [
      'Understand fundamentals of deep learning',
      'Learn architectures and optimization methods',
      'Implement models using TensorFlow',
      'Evaluate and build new DL applications',
    ],
  },
  {
    short_code: 'CS3104',
    name: 'Compiler Design',
    semester: 6,
    cos: [
      'Understand lexical analysis and tokenization',
      'Analyze syntax and semantic processing',
      'Implement intermediate code generation',
      'Analyze optimization and code generation',
    ],
  },
  {
    short_code: 'CS3202',
    name: 'Data Mining',
    semester: 6,
    cos: [
      'Understand data mining concepts and association rules',
      'Learn classification and clustering techniques',
      'Analyze data mining systems critically',
      'Apply data mining technologies practically',
    ],
  },
  {
    short_code: 'BH3403',
    name: 'Entrepreneurship Development',
    semester: 6,
    cos: [
      'Exemplifying the business opportunities, social responsibilities and the support system for setting up an enterprise.',
      'Determining stages of Entrepreneurial Process starting from idea generation, developing a business plan and operational aspects of an Enterprise.',
      'Appraising the different funding options and Financial Management of an enterprise.',
      'Assessing the Start-up management practices like incubation, mentorship and Government initiatives.',
    ],
  },
  {
    short_code: 'CS3206',
    name: 'Computer Vision',
    semester: 6,
    cos: [
      'Apply transforms like Fourier, DCT, and Wavelet for image representation and analysis',
      'Perform image pre processing using smoothing, edge, and corner detection.',
      'Implement segmentation and recognition using SIFT, RANSAC, and Random Forests.',
      'Analyze 3D scenes using projective geometry and epipolar constraints.',
    ],
  },
  {
    short_code: 'IP3403',
    name: 'Industrial Safety Engineering',
    semester: 6,
    cos: [
      'Apply safety principles in various work environments, especially in construction and machine operations.',
      'Identify safety hazards, implement safety measures,',
      'Analyse risks to prevent accidents and injuries.',
      'Understand of safety protocols, policies, and the responsibilities of individuals and organizations in ensuring a safe working environment.',
    ],
  },
];

async function upsertProgramme(name) {
  const { rows } = await client.query(
    `INSERT INTO programmes (name)
     VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, name`,
    [name]
  );
  return rows[0];
}

async function upsertBranch(programmeId, name) {
  const { rows } = await client.query(
    `INSERT INTO branches (programme_id, name)
     VALUES ($1, $2)
     ON CONFLICT (programme_id, name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, name`,
    [programmeId, name]
  );
  return rows[0];
}

async function upsertSubject(branchId, semester, name, shortCode, orderIndex) {
  const { rows } = await client.query(
    `INSERT INTO subjects (branch_id, semester, name, short_code, order_index)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (branch_id, semester, short_code)
     DO UPDATE SET
       name = EXCLUDED.name,
       order_index = EXCLUDED.order_index
     RETURNING id, name, short_code`,
    [branchId, semester, name, shortCode, orderIndex]
  );
  return rows[0];
}

async function upsertCO(subjectId, shortCode, description, orderIndex) {
  const coCode = `${shortCode}-CO${orderIndex}`;
  const { rows } = await client.query(
    `INSERT INTO course_outcomes (subject_id, co_code, description, order_index)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (subject_id, co_code)
     DO UPDATE SET
       description = EXCLUDED.description,
       order_index = EXCLUDED.order_index
     RETURNING id, co_code`,
    [subjectId, coCode, description, orderIndex]
  );
  return rows[0];
}

async function ensureAdminExists() {
  const { rows } = await client.query(
    `SELECT id, email FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1`
  );

  if (!rows[0]) {
    throw new Error('No admin user found. Run init-db with ADMIN_EMAIL and ADMIN_PASSWORD first.');
  }

  return rows[0];
}

async function upsertFaculty({ name, designation, email, phone }) {
  const existing = await client.query(
    `SELECT id FROM users WHERE email = $1`,
    [email]
  );

  if (existing.rowCount > 0) {
    await client.query(
      `UPDATE users
       SET name = $1,
           designation = $2,
           phone = $3,
           role = 'faculty',
           updated_at = NOW()
       WHERE email = $4`,
      [name, designation, phone, email]
    );
    return { email, created: false, temp_password: null };
  }

  const tempPassword = facultyTempPassword(email);
  const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

  await client.query(
    `INSERT INTO users (name, email, designation, phone, password_hash, role, must_change_password)
     VALUES ($1, $2, $3, $4, $5, 'faculty', true)`,
    [name, email, designation, phone, passwordHash]
  );

  return { email, created: true, temp_password: tempPassword };
}

async function seed() {
  await client.connect();
  console.log('Connected to PostgreSQL');

  try {
    const admin = await ensureAdminExists();
    console.log(`Admin available: ${admin.email}`);

    const programme = await upsertProgramme(PROGRAMME_NAME);
    console.log(`Programme seeded: ${programme.name}`);

    const branchMap = {};
    for (const branchName of BRANCH_NAMES) {
      const branch = await upsertBranch(programme.id, branchName);
      branchMap[branch.name] = branch.id;
      console.log(`Branch seeded: ${branch.name}`);
    }

    const itBranchId = branchMap['Information Technology'];
    if (!itBranchId) {
      throw new Error('Information Technology branch was not created');
    }

    for (const [index, subject] of IT_SEM6_SUBJECTS.entries()) {
      const savedSubject = await upsertSubject(
        itBranchId,
        subject.semester,
        subject.name,
        subject.short_code,
        index + 1
      );

      console.log(`Subject seeded: ${savedSubject.short_code} - ${savedSubject.name}`);

      for (const [coIndex, description] of subject.cos.entries()) {
        const savedCO = await upsertCO(
          savedSubject.id,
          subject.short_code,
          description,
          coIndex + 1
        );
        console.log(`  ${savedCO.co_code}`);
      }
    }

    const facultyResults = [];
    for (const faculty of FACULTY_SEED) {
      const result = await upsertFaculty(faculty);
      facultyResults.push(result);
      console.log(`${result.created ? 'Faculty seeded' : 'Faculty refreshed'}: ${faculty.email}`);
    }

    console.log('\nSeed complete.');
    console.log('Seeded data:');
    console.log('- admins: existing admin preserved');
    console.log(`- programme: ${PROGRAMME_NAME}`);
    console.log(`- branches: ${BRANCH_NAMES.join(', ')}`);
    console.log('- subjects + COs: Information Technology semester 6 only');
    console.log(`- faculty users: ${facultyResults.length} ensured (no subject assignments)`);
    facultyResults
      .filter((faculty) => faculty.created)
      .forEach((faculty) => {
        console.log(`  - ${faculty.email} temp password: ${faculty.temp_password}`);
      });
    console.log('- faculty assignment: not seeded');
  } finally {
    await client.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
