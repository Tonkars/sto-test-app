-- New database schema for individual appointment records
-- This replaces the JSONB array approach with normalized records

-- Create table for tracking datasets (uploaded files)
CREATE TABLE IF NOT EXISTS appointment_datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_by_email TEXT,
  record_count INTEGER DEFAULT 0
);

-- Create table for individual appointment records
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID REFERENCES appointment_datasets(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  store_name TEXT,
  creation_date DATE,
  creation_date_text TEXT NOT NULL,
  source_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_by_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for data backups (prevents accidental data loss)
CREATE TABLE IF NOT EXISTS appointment_backups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  backup_name TEXT NOT NULL,
  backup_data JSONB NOT NULL,
  original_dataset_id UUID,
  backed_up_by UUID REFERENCES auth.users(id),
  backed_up_by_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  auto_backup BOOLEAN DEFAULT false
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_dataset_id ON appointments(dataset_id);
CREATE INDEX IF NOT EXISTS idx_appointments_creation_date ON appointments(creation_date);
CREATE INDEX IF NOT EXISTS idx_appointments_user_name ON appointments(user_name);
CREATE INDEX IF NOT EXISTS idx_appointments_store_name ON appointments(store_name);
CREATE INDEX IF NOT EXISTS idx_appointment_backups_created_at ON appointment_backups(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE appointment_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_backups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Allow authenticated users to read datasets" ON appointment_datasets;
DROP POLICY IF EXISTS "Allow authenticated users to insert datasets" ON appointment_datasets;
DROP POLICY IF EXISTS "Allow authenticated users to update datasets" ON appointment_datasets;
DROP POLICY IF EXISTS "Allow authenticated users to delete datasets" ON appointment_datasets;

DROP POLICY IF EXISTS "Allow authenticated users to read appointments" ON appointments;
DROP POLICY IF EXISTS "Allow authenticated users to insert appointments" ON appointments;
DROP POLICY IF EXISTS "Allow authenticated users to update appointments" ON appointments;
DROP POLICY IF EXISTS "Allow authenticated users to delete appointments" ON appointments;

DROP POLICY IF EXISTS "Allow authenticated users to read backups" ON appointment_backups;
DROP POLICY IF EXISTS "Allow authenticated users to create backups" ON appointment_backups;
DROP POLICY IF EXISTS "Allow authenticated users to delete backups" ON appointment_backups;

-- RLS Policies - Allow all authenticated users to read/write shared data
CREATE POLICY "Allow authenticated users to read datasets" ON appointment_datasets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert datasets" ON appointment_datasets
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update datasets" ON appointment_datasets
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete datasets" ON appointment_datasets
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read appointments" ON appointments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert appointments" ON appointments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update appointments" ON appointments
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete appointments" ON appointments
  FOR DELETE TO authenticated USING (true);

-- RLS Policies for backups - Allow all authenticated users to read/write backups
CREATE POLICY "Allow authenticated users to read backups" ON appointment_backups
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to create backups" ON appointment_backups
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete backups" ON appointment_backups
  FOR DELETE TO authenticated USING (true);

-- Optional: Drop old table if you want to clean up
-- DROP TABLE IF EXISTS shared_appointments;