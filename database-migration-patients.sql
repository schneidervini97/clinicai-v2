-- =====================================================
-- MIGRATION: Patients Module
-- Description: Create patients table and related tables
-- Date: 2024
-- =====================================================

-- Create patients table
CREATE TABLE patients (
  -- Primary Key
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  
  -- Basic Data (Required Fields)
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  cpf TEXT,
  media_origin TEXT,
  
  -- Personal Data
  birth_date DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', NULL)),
  rg TEXT,
  photo_url TEXT,
  
  -- Address
  cep TEXT,
  address TEXT,
  address_number TEXT,
  address_complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  
  -- Medical Data
  allergies TEXT[],
  current_medications TEXT[],
  medical_notes TEXT,
  blood_type TEXT,
  health_insurance TEXT,
  health_insurance_number TEXT,
  
  -- Relationship Data
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  first_appointment_date DATE,
  last_appointment_date DATE,
  tags TEXT[],
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  
  -- Marketing/Commercial
  referral_details TEXT,
  lgpd_consent BOOLEAN DEFAULT false,
  lgpd_consent_date TIMESTAMP WITH TIME ZONE,
  whatsapp_consent BOOLEAN DEFAULT false,
  email_marketing_consent BOOLEAN DEFAULT false,
  nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
  last_nps_date DATE,
  
  -- Control Fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_by UUID REFERENCES profiles(id),
  internal_notes TEXT,
  
  -- Constraints
  UNIQUE(clinic_id, cpf),
  UNIQUE(clinic_id, email)
);

-- Create indexes for better performance
CREATE INDEX idx_patients_clinic_id ON patients(clinic_id);
CREATE INDEX idx_patients_cpf ON patients(cpf);
CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_patients_email ON patients(email);
CREATE INDEX idx_patients_name ON patients(name);
CREATE INDEX idx_patients_status ON patients(status);
CREATE INDEX idx_patients_created_at ON patients(created_at DESC);

-- Create patient_documents table for file attachments
CREATE TABLE patient_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  notes TEXT
);

CREATE INDEX idx_patient_documents_patient_id ON patient_documents(patient_id);
CREATE INDEX idx_patient_documents_clinic_id ON patient_documents(clinic_id);

-- Create patient_history table for audit log
CREATE TABLE patient_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'archived', 'restored', 'merged')),
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  notes TEXT
);

CREATE INDEX idx_patient_history_patient_id ON patient_history(patient_id);
CREATE INDEX idx_patient_history_changed_at ON patient_history(changed_at DESC);

-- Create pipeline_history table
CREATE TABLE pipeline_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  stage TEXT NOT NULL,
  previous_stage TEXT,
  entered_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  exited_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  moved_by UUID REFERENCES profiles(id),
  notes TEXT,
  outcome TEXT -- converted, lost, etc
);

CREATE INDEX idx_pipeline_history_patient_id ON pipeline_history(patient_id);
CREATE INDEX idx_pipeline_history_entered_at ON pipeline_history(entered_at DESC);

-- Create financial_transactions table
CREATE TABLE financial_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('payment', 'refund', 'adjustment')),
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  description TEXT,
  service_date DATE,
  payment_date DATE,
  invoice_number TEXT,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_by UUID REFERENCES profiles(id),
  notes TEXT
);

CREATE INDEX idx_financial_transactions_patient_id ON financial_transactions(patient_id);
CREATE INDEX idx_financial_transactions_clinic_id ON financial_transactions(clinic_id);
CREATE INDEX idx_financial_transactions_payment_date ON financial_transactions(payment_date DESC);
CREATE INDEX idx_financial_transactions_status ON financial_transactions(status);

-- Enable Row Level Security (RLS)
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for patients
CREATE POLICY "Users can view patients from their clinic" 
  ON patients FOR SELECT 
  USING (clinic_id IN (
    SELECT clinic_id FROM clinics WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert patients to their clinic" 
  ON patients FOR INSERT 
  WITH CHECK (clinic_id IN (
    SELECT clinic_id FROM clinics WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update patients from their clinic" 
  ON patients FOR UPDATE 
  USING (clinic_id IN (
    SELECT clinic_id FROM clinics WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete patients from their clinic" 
  ON patients FOR DELETE 
  USING (clinic_id IN (
    SELECT clinic_id FROM clinics WHERE user_id = auth.uid()
  ));

-- RLS Policies for patient_documents
CREATE POLICY "Users can view documents from their clinic" 
  ON patient_documents FOR SELECT 
  USING (clinic_id IN (
    SELECT clinic_id FROM clinics WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert documents to their clinic" 
  ON patient_documents FOR INSERT 
  WITH CHECK (clinic_id IN (
    SELECT clinic_id FROM clinics WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update documents from their clinic" 
  ON patient_documents FOR UPDATE 
  USING (clinic_id IN (
    SELECT clinic_id FROM clinics WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete documents from their clinic" 
  ON patient_documents FOR DELETE 
  USING (clinic_id IN (
    SELECT clinic_id FROM clinics WHERE user_id = auth.uid()
  ));

-- RLS Policies for patient_history
CREATE POLICY "Users can view history from their clinic" 
  ON patient_history FOR SELECT 
  USING (clinic_id IN (
    SELECT clinic_id FROM clinics WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert history to their clinic" 
  ON patient_history FOR INSERT 
  WITH CHECK (clinic_id IN (
    SELECT clinic_id FROM clinics WHERE user_id = auth.uid()
  ));

-- RLS Policies for pipeline_history
CREATE POLICY "Users can view pipeline history from their clinic" 
  ON pipeline_history FOR SELECT 
  USING (clinic_id IN (
    SELECT clinic_id FROM clinics WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert pipeline history to their clinic" 
  ON pipeline_history FOR INSERT 
  WITH CHECK (clinic_id IN (
    SELECT clinic_id FROM clinics WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update pipeline history from their clinic" 
  ON pipeline_history FOR UPDATE 
  USING (clinic_id IN (
    SELECT clinic_id FROM clinics WHERE user_id = auth.uid()
  ));

-- RLS Policies for financial_transactions
CREATE POLICY "Users can view transactions from their clinic" 
  ON financial_transactions FOR SELECT 
  USING (clinic_id IN (
    SELECT clinic_id FROM clinics WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert transactions to their clinic" 
  ON financial_transactions FOR INSERT 
  WITH CHECK (clinic_id IN (
    SELECT clinic_id FROM clinics WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update transactions from their clinic" 
  ON financial_transactions FOR UPDATE 
  USING (clinic_id IN (
    SELECT clinic_id FROM clinics WHERE user_id = auth.uid()
  ));

-- Create trigger for updated_at
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to log patient history automatically
CREATE OR REPLACE FUNCTION log_patient_changes() 
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO patient_history (
      patient_id, 
      clinic_id, 
      action, 
      changed_by, 
      notes
    ) VALUES (
      NEW.id, 
      NEW.clinic_id, 
      'created', 
      NEW.created_by,
      'Patient record created'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log only if important fields changed
    IF OLD.name != NEW.name OR 
       OLD.phone != NEW.phone OR 
       OLD.email != NEW.email OR 
       OLD.cpf != NEW.cpf OR
       OLD.status != NEW.status THEN
      INSERT INTO patient_history (
        patient_id, 
        clinic_id, 
        action, 
        changed_by,
        notes
      ) VALUES (
        NEW.id, 
        NEW.clinic_id, 
        'updated', 
        auth.uid(),
        'Patient record updated'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic history logging
CREATE TRIGGER log_patient_changes_trigger
  AFTER INSERT OR UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION log_patient_changes();

-- Create view for patient statistics
CREATE VIEW patient_stats AS
SELECT 
  clinic_id,
  COUNT(*) as total_patients,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_patients,
  COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_patients,
  COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_patients,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_patients_30d,
  COUNT(CASE WHEN birth_date IS NOT NULL AND 
    EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM NOW()) THEN 1 END) as birthdays_this_month
FROM patients
GROUP BY clinic_id;

-- Grant permissions on the view
GRANT SELECT ON patient_stats TO authenticated;