-- Chat WhatsApp system: Database schema for Evolution API integration
-- Run this in Supabase SQL Editor after the existing migrations

-- Configuração WhatsApp da clínica
CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  instance_name TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  evolution_instance_id TEXT,
  qr_code TEXT,
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'qr_code', 'connected', 'error')),
  webhook_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(clinic_id)
);

-- Conversas/threads
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  patient_phone TEXT NOT NULL,
  patient_name TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_message_preview TEXT,
  unread_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Mensagens
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  content TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'document', 'video', 'sticker', 'location', 'contact')),
  media_url TEXT,
  media_caption TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  evolution_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Contatos não cadastrados como pacientes
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  push_name TEXT,
  profile_picture_url TEXT,
  last_seen TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(clinic_id, phone)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_clinic ON whatsapp_connections(clinic_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_instance ON whatsapp_connections(instance_name);
CREATE INDEX IF NOT EXISTS idx_conversations_clinic_status ON conversations(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(clinic_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_patient ON conversations(patient_id);
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(patient_phone);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_clinic ON messages(clinic_id);
CREATE INDEX IF NOT EXISTS idx_messages_evolution_id ON messages(evolution_message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_clinic_phone ON whatsapp_contacts(clinic_id, phone);

-- Habilitar Row Level Security
ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies para whatsapp_connections
DROP POLICY IF EXISTS "Clinics can view own WhatsApp connections" ON whatsapp_connections;
CREATE POLICY "Clinics can view own WhatsApp connections" ON whatsapp_connections
  FOR SELECT USING (clinic_id IN (
    SELECT id FROM clinics WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Clinics can manage own WhatsApp connections" ON whatsapp_connections;
CREATE POLICY "Clinics can manage own WhatsApp connections" ON whatsapp_connections
  FOR ALL USING (clinic_id IN (
    SELECT id FROM clinics WHERE user_id = auth.uid()
  ));

-- RLS Policies para conversations
DROP POLICY IF EXISTS "Clinics can view own conversations" ON conversations;
CREATE POLICY "Clinics can view own conversations" ON conversations
  FOR SELECT USING (clinic_id IN (
    SELECT id FROM clinics WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Clinics can manage own conversations" ON conversations;
CREATE POLICY "Clinics can manage own conversations" ON conversations
  FOR ALL USING (clinic_id IN (
    SELECT id FROM clinics WHERE user_id = auth.uid()
  ));

-- RLS Policies para messages
DROP POLICY IF EXISTS "Clinics can view own messages" ON messages;
CREATE POLICY "Clinics can view own messages" ON messages
  FOR SELECT USING (clinic_id IN (
    SELECT id FROM clinics WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Clinics can manage own messages" ON messages;
CREATE POLICY "Clinics can manage own messages" ON messages
  FOR ALL USING (clinic_id IN (
    SELECT id FROM clinics WHERE user_id = auth.uid()
  ));

-- RLS Policies para whatsapp_contacts
DROP POLICY IF EXISTS "Clinics can view own whatsapp contacts" ON whatsapp_contacts;
CREATE POLICY "Clinics can view own whatsapp contacts" ON whatsapp_contacts
  FOR SELECT USING (clinic_id IN (
    SELECT id FROM clinics WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Clinics can manage own whatsapp contacts" ON whatsapp_contacts;
CREATE POLICY "Clinics can manage own whatsapp contacts" ON whatsapp_contacts
  FOR ALL USING (clinic_id IN (
    SELECT id FROM clinics WHERE user_id = auth.uid()
  ));

-- Triggers para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_whatsapp_connections_updated_at BEFORE UPDATE ON whatsapp_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_contacts_updated_at BEFORE UPDATE ON whatsapp_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para criar nome de instância único
CREATE OR REPLACE FUNCTION generate_instance_name(clinic_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN 'clinic_' || REPLACE(clinic_uuid::text, '-', '');
END;
$$ LANGUAGE plpgsql;

-- View para estatísticas do chat
CREATE VIEW chat_stats AS
SELECT 
  c.id as clinic_id,
  COUNT(DISTINCT conv.id) as total_conversations,
  COUNT(DISTINCT CASE WHEN conv.status = 'active' THEN conv.id END) as active_conversations,
  COALESCE(SUM(conv.unread_count), 0) as total_unread,
  COUNT(DISTINCT CASE WHEN m.direction = 'inbound' AND m.created_at > NOW() - INTERVAL '24 hours' THEN conv.id END) as conversations_24h
FROM clinics c
LEFT JOIN conversations conv ON c.id = conv.clinic_id
LEFT JOIN messages m ON conv.id = m.conversation_id
GROUP BY c.id;

-- Função para incrementar contador de mensagens não lidas
CREATE OR REPLACE FUNCTION increment_unread_count(conversation_id UUID)
RETURNS INTEGER AS $$
DECLARE
    new_count INTEGER;
BEGIN
    UPDATE conversations 
    SET unread_count = unread_count + 1,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = conversation_id
    RETURNING unread_count INTO new_count;
    
    RETURN COALESCE(new_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Comentários para documentação
COMMENT ON TABLE whatsapp_connections IS 'Armazena as configurações de conexão WhatsApp para cada clínica';
COMMENT ON TABLE conversations IS 'Threads de conversas entre clínica e pacientes/contatos';
COMMENT ON TABLE messages IS 'Mensagens individuais dentro das conversas';
COMMENT ON TABLE whatsapp_contacts IS 'Contatos do WhatsApp que ainda não foram cadastrados como pacientes';
COMMENT ON VIEW chat_stats IS 'Estatísticas em tempo real do sistema de chat para cada clínica';
COMMENT ON FUNCTION increment_unread_count IS 'Incrementa o contador de mensagens não lidas de uma conversa';