-- Enable the pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ROLES Table
CREATE TABLE roles (
  role_id SERIAL PRIMARY KEY,
  role_name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- USERS Table (UUID, with soft delete)
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  firebase_uid VARCHAR(255) NOT NULL UNIQUE,
  role_id INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  CONSTRAINT fk_role FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE RESTRICT
);

-- PROFILES Table (Simpler, no date_of_birth)
-- PROFILES Table
CREATE TABLE profiles (
  profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  avatar_url TEXT DEFAULT NULL,
  fully_onboarded BOOLEAN DEFAULT FALSE NOT NULL, -- <-- ADD THIS LINE
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT unique_user_profile UNIQUE (user_id)
);

-- Default seed data for roles
INSERT INTO roles (role_name) VALUES ('admin');
INSERT INTO roles (role_name) VALUES ('user');

-- Indexes
CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- AUDIT LOGS Table
CREATE TABLE audit_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID, -- NULL allowed for system
  target_user_id UUID,
  action TEXT NOT NULL,
  table_name VARCHAR(255),
  record_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_actor FOREIGN KEY (actor_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT fk_target FOREIGN KEY (target_user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- PAYMENTS Table
CREATE TABLE payments (
  payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_status VARCHAR(50), 
  subscription_plan VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT unique_subscription UNIQUE (stripe_subscription_id)
);

-- Audit log indexes
CREATE INDEX idx_audit_actor_user_id ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_target_user_id ON audit_logs(target_user_id);
CREATE INDEX idx_audit_table_record ON audit_logs(table_name, record_id);

CREATE TABLE clients (
  client_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_clients_user_id ON clients(user_id);

CREATE TABLE invoices (
  invoice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID NOT NULL,
  invoice_number VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- e.g., 'draft', 'sent', 'viewed', 'paid', 'overdue', 'void'
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL,
  notes TEXT,
  stripe_payment_intent_id TEXT, -- To track payment status with Stripe
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_client FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE RESTRICT,
  CONSTRAINT unique_invoice_number_per_user UNIQUE (user_id, invoice_number)
);

CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);

CREATE TABLE invoice_items (
  item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE
);

CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);

ALTER TABLE invoices
ADD COLUMN last_follow_up_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN follow_up_count INT DEFAULT 0;

CREATE TABLE invoice_follow_ups (
  follow_up_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL,
  user_id UUID NOT NULL,
  method VARCHAR(50) NOT NULL, -- 'email', 'sms', etc.
  message TEXT,
  sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_invoice_followup_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE,
  CONSTRAINT fk_invoice_followup_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_invoice_follow_ups_invoice_id ON invoice_follow_ups(invoice_id);

ALTER TABLE invoices
ADD COLUMN viewed_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN view_count INT DEFAULT 0;

ALTER TABLE invoices
  ADD COLUMN auto_followups_enabled   BOOLEAN DEFAULT FALSE,
  ADD COLUMN view_reminder_days       INT     DEFAULT NULL,
  ADD COLUMN due_reminder_days        INT     DEFAULT NULL,
  ADD COLUMN repeat_interval_days     INT     DEFAULT NULL,
  ADD COLUMN followup_message_template TEXT   DEFAULT NULL;
