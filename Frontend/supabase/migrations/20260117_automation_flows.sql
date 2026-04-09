-- ============================================
-- WhatsApp Automation Platform - Core Tables
-- ============================================

-- 1. AUTOMATION FLOWS
-- Stores the visual flow definitions with nodes and edges
CREATE TABLE IF NOT EXISTS automation_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'inactive', 'archived')),
  priority INTEGER DEFAULT 0,
  config JSONB DEFAULT '{
    "allow_multiple_executions": false,
    "max_executions": 1,
    "default_timeout_minutes": 60,
    "retry_on_error": false
  }'::jsonb,
  nodes JSONB DEFAULT '[]'::jsonb,  -- ReactFlow nodes array
  edges JSONB DEFAULT '[]'::jsonb,  -- ReactFlow edges array
  execution_stats JSONB DEFAULT '{"total": 0, "success": 0, "failed": 0, "cancelled": 0}'::jsonb,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ  -- Soft delete
);

-- 2. AUTOMATION FLOW TRIGGERS
-- Defines when a flow should start
CREATE TABLE IF NOT EXISTS automation_flow_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES automation_flows(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'keyword_exact',      -- Exact word match
    'keyword_contains',   -- Message contains word
    'first_message',      -- First contact from user
    'regex',              -- Regular expression match
    'schedule',           -- Time-based trigger
    'inactivity',         -- After X minutes without response
    'tag_added',          -- When tag is added to contact
    'manual',             -- Manual trigger by user
    'webhook'             -- External webhook trigger
  )),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Example configs:
  -- keyword_exact: {"keywords": ["oi", "ola", "hello"], "case_sensitive": false}
  -- keyword_contains: {"keywords": ["orçamento"], "normalize_accents": true}
  -- regex: {"pattern": "^[0-9]+$", "flags": "i"}
  -- first_message: {"only_new_contacts": true, "exclude_tags": ["ignore"]}
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  conditions JSONB DEFAULT '{}'::jsonb,
  -- conditions: {"business_hours_only": true, "exclude_tags": ["vip"], "require_tags": []}
  min_interval_minutes INTEGER DEFAULT 0,  -- Minimum time between triggers for same contact
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. AUTOMATION FLOW EXECUTIONS
-- Tracks active and completed flow executions
CREATE TABLE IF NOT EXISTS automation_flow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES automation_flows(id),
  contact_id UUID NOT NULL REFERENCES whatsapp_contacts(id),
  chat_id UUID REFERENCES whatsapp_chats(id),
  instance_id UUID REFERENCES whatsapp_instances(id),
  status TEXT DEFAULT 'running' CHECK (status IN (
    'running',           -- Currently executing
    'waiting_response',  -- Waiting for user reply
    'paused',            -- Manually paused
    'completed',         -- Successfully finished
    'failed',            -- Error occurred
    'cancelled',         -- Manually cancelled
    'timeout'            -- Expired waiting for response
  )),
  current_node_id TEXT,  -- ID of the current node in the flow
  context JSONB DEFAULT '{}'::jsonb,  -- Collected variables
  -- Example: {"nome": "João", "produto": "CRM", "email": "joao@email.com"}
  shared_context JSONB DEFAULT '{}'::jsonb,  -- Variables shared between flows
  trigger_type TEXT,
  trigger_data JSONB DEFAULT '{}'::jsonb,  -- What triggered this execution
  parent_execution_id UUID REFERENCES automation_flow_executions(id),  -- For sub-flows
  node_history JSONB DEFAULT '[]'::jsonb,  -- Path taken through nodes
  -- Example: [{"node_id": "1", "entered_at": "...", "exited_at": "..."}]
  wait_config JSONB,  -- Config when status = waiting_response
  -- Example: {"variable_name": "nome", "timeout_minutes": 10, "validation": {"type": "text"}}
  error_log JSONB,  -- Error details if failed
  started_at TIMESTAMPTZ DEFAULT now(),
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ  -- When waiting_response should timeout
);

-- 4. AUTOMATION PAUSE RULES
-- Controls when automation should be paused
CREATE TABLE IF NOT EXISTS automation_pause_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN (
    'global',   -- Pause all flows for company
    'flow',     -- Pause specific flow
    'contact',  -- Pause for specific contact
    'tag'       -- Pause for contacts with tag
  )),
  scope_id UUID,  -- flow_id, contact_id, or NULL for global
  scope_tag TEXT,  -- Tag name when scope = 'tag'
  reason TEXT,
  is_active BOOLEAN DEFAULT true,
  is_temporary BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,  -- For temporary pauses
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. AUTOMATION LOGS (for debugging and auditing)
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES automation_flow_executions(id) ON DELETE CASCADE,
  flow_id UUID REFERENCES automation_flows(id) ON DELETE SET NULL,
  company_id UUID REFERENCES company(id) ON DELETE CASCADE,
  level TEXT DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

-- Flows
CREATE INDEX IF NOT EXISTS idx_automation_flows_company 
  ON automation_flows(company_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_automation_flows_status 
  ON automation_flows(company_id, status) 
  WHERE deleted_at IS NULL AND status = 'active';

-- Triggers
CREATE INDEX IF NOT EXISTS idx_automation_triggers_flow 
  ON automation_flow_triggers(flow_id) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_automation_triggers_type 
  ON automation_flow_triggers(type) 
  WHERE is_active = true;

-- Executions
CREATE INDEX IF NOT EXISTS idx_automation_executions_contact 
  ON automation_flow_executions(contact_id, status);

CREATE INDEX IF NOT EXISTS idx_automation_executions_waiting 
  ON automation_flow_executions(contact_id) 
  WHERE status = 'waiting_response';

CREATE INDEX IF NOT EXISTS idx_automation_executions_flow 
  ON automation_flow_executions(flow_id, status);

CREATE INDEX IF NOT EXISTS idx_automation_executions_expires 
  ON automation_flow_executions(expires_at) 
  WHERE status = 'waiting_response' AND expires_at IS NOT NULL;

-- Pause Rules
CREATE INDEX IF NOT EXISTS idx_automation_pause_company 
  ON automation_pause_rules(company_id) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_automation_pause_scope 
  ON automation_pause_rules(company_id, scope, scope_id) 
  WHERE is_active = true;

-- Logs
CREATE INDEX IF NOT EXISTS idx_automation_logs_execution 
  ON automation_logs(execution_id);

CREATE INDEX IF NOT EXISTS idx_automation_logs_company 
  ON automation_logs(company_id, created_at DESC);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE automation_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_flow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_flow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_pause_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- Flows policies
CREATE POLICY "Users can view flows from their company"
  ON automation_flows FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert flows in their company"
  ON automation_flows FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update flows in their company"
  ON automation_flows FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete flows in their company"
  ON automation_flows FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Triggers policies
CREATE POLICY "Users can view triggers from their flows"
  ON automation_flow_triggers FOR SELECT
  USING (flow_id IN (
    SELECT id FROM automation_flows 
    WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can manage triggers for their flows"
  ON automation_flow_triggers FOR ALL
  USING (flow_id IN (
    SELECT id FROM automation_flows 
    WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  ));

-- Executions policies
CREATE POLICY "Users can view executions from their company"
  ON automation_flow_executions FOR SELECT
  USING (flow_id IN (
    SELECT id FROM automation_flows 
    WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can update executions from their company"
  ON automation_flow_executions FOR UPDATE
  USING (flow_id IN (
    SELECT id FROM automation_flows 
    WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  ));

-- Pause rules policies
CREATE POLICY "Users can view pause rules from their company"
  ON automation_pause_rules FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage pause rules in their company"
  ON automation_pause_rules FOR ALL
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Logs policies
CREATE POLICY "Users can view logs from their company"
  ON automation_logs FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_automation_flows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_automation_flows_updated_at
  BEFORE UPDATE ON automation_flows
  FOR EACH ROW
  EXECUTE FUNCTION update_automation_flows_updated_at();

-- ============================================
-- ENABLE REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE automation_flows;
ALTER PUBLICATION supabase_realtime ADD TABLE automation_flow_executions;
ALTER PUBLICATION supabase_realtime ADD TABLE automation_pause_rules;
