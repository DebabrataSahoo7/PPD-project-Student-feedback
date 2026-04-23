-- ============================================================
-- FEEDBACK SYSTEM - PostgreSQL Schema
-- Naming: snake_case | Timestamps: UTC | Version: 1.0
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'faculty', 'student');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE form_mode AS ENUM ('academic', 'simple');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE form_status AS ENUM ('draft', 'published', 'closed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE question_type AS ENUM (
    'grid',
    'rating',
    'short_text',
    'long_text',
    'mcq',
    'checkbox',
    'dropdown',
    'linear_scale',
    'date'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE teaching_dimension AS ENUM (
    'theory',
    'delivery',
    'practical',
    'engagement',
    'assessment'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE attainment_level AS ENUM ('not_met', 'level_1', 'level_2', 'level_3');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number VARCHAR(50) UNIQUE,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  designation VARCHAR(150),
  phone VARCHAR(20),
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_registration_number ON users(registration_number);

CREATE TABLE programmes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (programme_id, name),
  UNIQUE (id, programme_id)
);

CREATE INDEX idx_branches_programme_id ON branches(programme_id);

CREATE TABLE student_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  admission_year INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_profiles_admission_year ON student_profiles(admission_year);

CREATE TABLE student_academic_status (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE RESTRICT,
  branch_id UUID NOT NULL,
  current_semester SMALLINT NOT NULL CHECK (current_semester BETWEEN 1 AND 12),
  section VARCHAR(20),
  academic_year VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT student_academic_status_branch_programme_fk
    FOREIGN KEY (branch_id, programme_id)
    REFERENCES branches(id, programme_id)
    ON DELETE RESTRICT
);

CREATE INDEX idx_student_academic_status_programme_id ON student_academic_status(programme_id);
CREATE INDEX idx_student_academic_status_branch_semester_year ON student_academic_status(branch_id, current_semester, academic_year);
CREATE INDEX idx_student_academic_status_section ON student_academic_status(section);

CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  semester SMALLINT NOT NULL CHECK (semester BETWEEN 1 AND 12),
  name VARCHAR(200) NOT NULL,
  short_code VARCHAR(20) NOT NULL,
  order_index SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (branch_id, semester, short_code)
);

CREATE INDEX idx_subjects_branch_id ON subjects(branch_id);

CREATE TABLE subject_faculty (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  faculty_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (subject_id, faculty_id)
);

CREATE INDEX idx_subject_faculty_faculty_id ON subject_faculty(faculty_id);
CREATE INDEX idx_subject_faculty_subject_id ON subject_faculty(subject_id);

CREATE TABLE course_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  co_code VARCHAR(20) NOT NULL,
  description TEXT NOT NULL,
  order_index SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (subject_id, co_code)
);

CREATE INDEX idx_course_outcomes_subject_id ON course_outcomes(subject_id);

CREATE TABLE dimension_co_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  dimension teaching_dimension NOT NULL,
  co_id UUID NOT NULL REFERENCES course_outcomes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (subject_id, dimension, co_id)
);

CREATE INDEX idx_dimension_co_map_subject_id ON dimension_co_map(subject_id);
CREATE INDEX idx_dimension_co_map_co_id ON dimension_co_map(co_id);

CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(300) NOT NULL,
  description TEXT,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  mode form_mode NOT NULL DEFAULT 'simple',
  programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL,
  branch_id UUID,
  semester SMALLINT CHECK (semester BETWEEN 1 AND 12),
  academic_year VARCHAR(20),
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  require_login BOOLEAN NOT NULL DEFAULT FALSE,
  allow_multiple_responses BOOLEAN NOT NULL DEFAULT FALSE,
  share_token VARCHAR(64) NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status form_status NOT NULL DEFAULT 'draft',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT academic_requires_context CHECK (
    mode = 'simple'
    OR (
      mode = 'academic'
      AND programme_id IS NOT NULL
      AND branch_id IS NOT NULL
      AND semester IS NOT NULL
      AND academic_year IS NOT NULL
    )
  ),
  CONSTRAINT forms_branch_programme_fk
    FOREIGN KEY (branch_id, programme_id)
    REFERENCES branches(id, programme_id)
    ON DELETE SET NULL
);

CREATE INDEX idx_forms_creator_id ON forms(creator_id);
CREATE INDEX idx_forms_share_token ON forms(share_token);
CREATE INDEX idx_forms_status ON forms(status);
CREATE INDEX idx_forms_context ON forms(programme_id, branch_id, semester, academic_year);

CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  order_index SMALLINT NOT NULL DEFAULT 0,
  text TEXT NOT NULL,
  type question_type NOT NULL,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  dimension teaching_dimension,
  scale_min SMALLINT DEFAULT 1,
  scale_max SMALLINT DEFAULT 5,
  scale_labels JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT dimension_only_for_grid CHECK (
    dimension IS NULL OR type = 'grid'
  )
);

CREATE INDEX idx_questions_form_id ON questions(form_id);
CREATE INDEX idx_questions_order ON questions(form_id, order_index);

CREATE TABLE question_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  label VARCHAR(200) NOT NULL,
  order_index SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_question_rows_question_id ON question_rows(question_id);

CREATE TABLE question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  label VARCHAR(300) NOT NULL,
  order_index SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_question_options_question_id ON question_options(question_id);

CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  respondent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  respondent_name VARCHAR(150),
  respondent_email VARCHAR(255),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_responses_form_id ON responses(form_id);
CREATE INDEX idx_responses_respondent_id ON responses(respondent_id);
CREATE INDEX idx_responses_respondent_email ON responses(respondent_email);

CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  text_value TEXT,
  numeric_value NUMERIC(4,2),
  date_value DATE,
  UNIQUE (response_id, question_id)
);

CREATE INDEX idx_answers_response_id ON answers(response_id);
CREATE INDEX idx_answers_question_id ON answers(question_id);

CREATE TABLE answer_grid_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  question_row_id UUID NOT NULL REFERENCES question_rows(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  value SMALLINT NOT NULL,
  UNIQUE (answer_id, question_row_id)
);

CREATE INDEX idx_answer_grid_values_answer_id ON answer_grid_values(answer_id);
CREATE INDEX idx_answer_grid_values_subject_id ON answer_grid_values(subject_id);

CREATE TABLE answer_selected_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES question_options(id) ON DELETE CASCADE,
  UNIQUE (answer_id, option_id)
);

CREATE INDEX idx_answer_options_answer_id ON answer_selected_options(answer_id);

CREATE TABLE co_attainment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  co_id UUID NOT NULL REFERENCES course_outcomes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  avg_score NUMERIC(4,2) NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  level attainment_level NOT NULL,
  response_count INTEGER NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (form_id, co_id)
);

CREATE INDEX idx_co_attainment_form_id ON co_attainment_results(form_id);
CREATE INDEX idx_co_attainment_co_id ON co_attainment_results(co_id);

CREATE TABLE email_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reminder_sent_at TIMESTAMPTZ,
  responded BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (form_id, email)
);

CREATE INDEX idx_email_invites_form_id ON email_invites(form_id);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  link VARCHAR(500),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_student_profiles_updated_at
  BEFORE UPDATE ON student_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_programmes_updated_at
  BEFORE UPDATE ON programmes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_subjects_updated_at
  BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_course_outcomes_updated_at
  BEFORE UPDATE ON course_outcomes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_forms_updated_at
  BEFORE UPDATE ON forms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
