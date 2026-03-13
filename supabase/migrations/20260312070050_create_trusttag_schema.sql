/*
  # TrustTag Database Schema

  ## Overview
  Complete database schema for TrustTag - a document verification platform for professional credentials.

  ## New Tables
  
  ### `profiles`
  - `id` (uuid, references auth.users) - User ID from Supabase Auth
  - `email` (text) - User email
  - `full_name` (text) - User's full name
  - `role` (text) - User role: 'candidate', 'company', or 'admin'
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `companies`
  - `id` (uuid, primary key) - Unique company identifier
  - `user_id` (uuid, references profiles) - Associated user account
  - `company_name` (text) - Official company name
  - `business_email` (text) - Corporate email domain
  - `business_id` (text) - Government business ID (GSTIN/EIN/etc)
  - `is_verified_business` (boolean) - Admin-approved verification status
  - `created_at` (timestamptz) - Registration timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `documents`
  - `id` (uuid, primary key) - Unique document identifier
  - `candidate_id` (uuid, references profiles) - Document owner
  - `company_id` (uuid, references companies) - Tagged company for verification
  - `document_type` (text) - Type: 'offer_letter' or 'experience_letter'
  - `file_url` (text) - Storage URL for the PDF
  - `file_hash` (text) - SHA-256 hash for tamper detection
  - `file_name` (text) - Original filename
  - `status` (text) - Status: 'pending', 'verified', or 'rejected'
  - `qr_code_id` (text, unique) - Unique ID for QR code verification
  - `verified_at` (timestamptz) - Verification timestamp
  - `verified_by` (uuid, references profiles) - Who verified it
  - `rejection_reason` (text) - Reason if rejected
  - `created_at` (timestamptz) - Upload timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  
  1. Row Level Security (RLS) enabled on all tables
  2. Profiles: Users can read their own profile, companies can read candidate profiles
  3. Companies: Public read for verified companies, users can manage their own company
  4. Documents: Candidates see their own, companies see tagged documents, verified docs are public
  
  ## Important Notes
  
  - Business email validation happens at application level
  - File hashing ensures document integrity
  - QR code ID is generated as unique identifier for public verification
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('candidate', 'company', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  business_email text NOT NULL,
  business_id text NOT NULL,
  is_verified_business boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('offer_letter', 'experience_letter')),
  file_url text NOT NULL,
  file_hash text NOT NULL,
  file_name text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  qr_code_id text UNIQUE NOT NULL,
  verified_at timestamptz,
  verified_by uuid REFERENCES profiles(id),
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can read their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Companies can read candidate profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    role = 'candidate' 
    OR auth.uid() = id
  );

-- RLS Policies for companies
CREATE POLICY "Anyone can read verified companies"
  ON companies FOR SELECT
  TO authenticated
  USING (is_verified_business = true OR user_id = auth.uid());

CREATE POLICY "Users can create their own company"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own company"
  ON companies FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for documents
CREATE POLICY "Candidates can read their own documents"
  ON documents FOR SELECT
  TO authenticated
  USING (candidate_id = auth.uid());

CREATE POLICY "Companies can read documents tagged to them"
  ON documents FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can read verified documents by QR code"
  ON documents FOR SELECT
  TO anon, authenticated
  USING (status = 'verified');

CREATE POLICY "Candidates can insert their own documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (candidate_id = auth.uid());

CREATE POLICY "Candidates can update their own pending documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (candidate_id = auth.uid() AND status = 'pending')
  WITH CHECK (candidate_id = auth.uid());

CREATE POLICY "Companies can update documents tagged to them"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_verified ON companies(is_verified_business);
CREATE INDEX IF NOT EXISTS idx_documents_candidate ON documents(candidate_id);
CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_qr_code ON documents(qr_code_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();