-- ========================================================================
-- CHAT AI ASSISTANT TOGGLE - DATABASE MIGRATION
-- ========================================================================
-- Adds AI assistant toggle functionality to conversations
-- Run this after database-migration-chat.sql

-- Add ai_assistant_enabled field to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS ai_assistant_enabled BOOLEAN DEFAULT true;

-- Add index for performance when filtering by assistant status
CREATE INDEX IF NOT EXISTS idx_conversations_ai_assistant ON conversations(clinic_id, ai_assistant_enabled);

-- Update existing conversations to have AI assistant enabled by default
UPDATE conversations 
SET ai_assistant_enabled = true 
WHERE ai_assistant_enabled IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN conversations.ai_assistant_enabled IS 'Controls whether AI assistant is active for this conversation';