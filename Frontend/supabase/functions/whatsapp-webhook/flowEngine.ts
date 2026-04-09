/**
 * Flow Engine - Core automation logic
 * Handles trigger matching, flow execution, and node processing
 */

// ============================================
// TYPES
// ============================================

interface FlowNode {
    id: string;
    type: 'trigger' | 'message' | 'waitResponse' | 'condition' | 'action' | 'delay' | 'webhook' | 'jumpToFlow' | 'randomPath' | 'end';
    data: Record<string, any>;
    position: { x: number; y: number };
}

interface FlowEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;  // For conditional nodes with multiple outputs
}

interface Flow {
    id: string;
    company_id: string;
    name: string;
    status: string;
    priority: number;
    config: {
        allow_multiple_executions: boolean;
        max_executions: number;
        default_timeout_minutes: number;
        retry_on_error: boolean;
    };
    nodes: FlowNode[];
    edges: FlowEdge[];
}

interface FlowTrigger {
    id: string;
    flow_id: string;
    type: string;
    config: Record<string, any>;
    priority: number;
    conditions: Record<string, any>;
    min_interval_minutes: number;
}

interface FlowExecution {
    id: string;
    flow_id: string;
    contact_id: string;
    chat_id: string;
    instance_id: string;
    status: string;
    current_node_id: string | null;
    context: Record<string, any>;
    wait_config: Record<string, any> | null;
    node_history: Array<{ node_id: string; entered_at: string; exited_at?: string }>;
}

interface ExecutionContext {
    [key: string]: any;
    contact?: {
        id: string;
        name: string;
        phone: string;
        remote_jid: string;
    };
    flow?: {
        id: string;
        name: string;
    };
    company?: {
        id: string;
        name: string;
    };
}

const normalizePhone = (value?: string | null) => {
    if (!value) return '';
    return value
        .replace(/@s\.whatsapp\.net$/i, '')
        .replace(/@g\.us$/i, '')
        .replace(/\D/g, '');
};

const buildPhoneCandidates = (value?: string | null) => {
    if (!value) return [];
    const raw = String(value).trim();
    const digits = normalizePhone(raw);
    const withJid = digits ? `${digits}@s.whatsapp.net` : '';
    return Array.from(new Set([raw, digits, withJid].filter(Boolean)));
};

// ============================================
// PAUSE RULES CHECK
// ============================================

export async function checkPauseRules(
    supabase: any,
    companyId: string,
    contactId: string,
    flowId?: string,
    contactTags?: string[]
): Promise<{ isPaused: boolean; reason?: string }> {
    const now = new Date().toISOString();

    // Check all applicable pause rules
    const { data: pauseRules } = await supabase
        .from('automation_pause_rules')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${now}`);

    if (!pauseRules || pauseRules.length === 0) {
        return { isPaused: false };
    }

    for (const rule of pauseRules) {
        // Check global pause
        if (rule.scope === 'global') {
            return { isPaused: true, reason: rule.reason || 'Global automation pause' };
        }

        // Check flow-specific pause
        if (rule.scope === 'flow' && rule.scope_id === flowId) {
            return { isPaused: true, reason: rule.reason || 'Flow paused' };
        }

        // Check contact-specific pause
        if (rule.scope === 'contact' && rule.scope_id === contactId) {
            return { isPaused: true, reason: rule.reason || 'Contact automation paused' };
        }

        // Check tag-based pause
        if (rule.scope === 'tag' && contactTags?.includes(rule.scope_tag)) {
            return { isPaused: true, reason: rule.reason || `Tag '${rule.scope_tag}' paused` };
        }
    }

    return { isPaused: false };
}

// ============================================
// FIND WAITING EXECUTION
// ============================================

export async function findWaitingExecution(
    supabase: any,
    contactId: string
): Promise<FlowExecution | null> {
    const { data: execution } = await supabase
        .from('automation_flow_executions')
        .select('*, automation_flows!inner(*)')
        .eq('contact_id', contactId)
        .eq('status', 'waiting_response')
        .order('last_activity_at', { ascending: false })
        .limit(1)
        .single();

    return execution || null;
}

// ============================================
// TRIGGER MATCHING
// ============================================

function normalizeText(text: string, normalizeAccents: boolean = true): string {
    let normalized = text.toLowerCase().trim();
    if (normalizeAccents) {
        normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    return normalized;
}

function matchTrigger(trigger: FlowTrigger, message: string): boolean {
    const msgNormalized = normalizeText(message, trigger.config.normalize_accents !== false);

    switch (trigger.type) {
        case 'keyword_exact': {
            const keywords = trigger.config.keywords || [];
            const caseSensitive = trigger.config.case_sensitive || false;
            return keywords.some((kw: string) => {
                const kwNorm = caseSensitive ? kw : normalizeText(kw, trigger.config.normalize_accents !== false);
                const msgCmp = caseSensitive ? message.trim() : msgNormalized;
                return msgCmp === kwNorm;
            });
        }

        case 'keyword_contains': {
            const keywords = trigger.config.keywords || [];
            return keywords.some((kw: string) => {
                const kwNorm = normalizeText(kw, trigger.config.normalize_accents !== false);
                return msgNormalized.includes(kwNorm);
            });
        }

        case 'regex': {
            try {
                const pattern = trigger.config.pattern;
                const flags = trigger.config.flags || '';
                const regex = new RegExp(pattern, flags);
                return regex.test(message);
            } catch {
                return false;
            }
        }

        case 'first_message': {
            // This is handled separately - always matches if contact is new
            return true;
        }

        default:
            return false;
    }
}

export async function checkTriggers(
    supabase: any,
    companyId: string,
    contactId: string,
    message: string,
    isFirstMessage: boolean = false
): Promise<{ flow: Flow; trigger: FlowTrigger } | null> {
    // Get all active flows with their triggers
    const { data: flows } = await supabase
        .from('automation_flows')
        .select(`
      *,
      automation_flow_triggers!inner(*)
    `)
        .eq('company_id', companyId)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('priority', { ascending: false });

    if (!flows || flows.length === 0) {
        return null;
    }

    // Sort by flow priority, then trigger priority
    const allTriggers: Array<{ flow: Flow; trigger: FlowTrigger }> = [];
    for (const flow of flows) {
        const triggers = flow.automation_flow_triggers || [];
        for (const trigger of triggers) {
            if (trigger.is_active) {
                allTriggers.push({ flow, trigger });
            }
        }
    }

    allTriggers.sort((a, b) => {
        if (a.flow.priority !== b.flow.priority) {
            return b.flow.priority - a.flow.priority;
        }
        return b.trigger.priority - a.trigger.priority;
    });

    // Find first matching trigger
    for (const { flow, trigger } of allTriggers) {
        // Handle first_message trigger specially
        if (trigger.type === 'first_message') {
            if (isFirstMessage) {
                const onlyNew = trigger.config.only_new_contacts || false;
                if (!onlyNew || isFirstMessage) {
                    return { flow, trigger };
                }
            }
            continue;
        }

        // Check other trigger types
        if (matchTrigger(trigger, message)) {
            return { flow, trigger };
        }
    }

    return null;
}

// ============================================
// VARIABLE SUBSTITUTION
// ============================================

export function replaceVariables(template: string, context: ExecutionContext): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
        const keys = path.trim().split('.');
        let value: any = context;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return match; // Keep original if not found
            }
        }

        if (value === null || value === undefined) {
            return '';
        }

        return String(value);
    });
}

// ============================================
// NODE EXECUTION
// ============================================

function findNextNode(edges: FlowEdge[], currentNodeId: string, sourceHandle?: string): string | null {
    const edge = edges.find(e => {
        if (e.source !== currentNodeId) return false;
        if (sourceHandle && e.sourceHandle !== sourceHandle) return false;
        return true;
    });
    return edge?.target || null;
}

function findTriggerNode(nodes: FlowNode[]): FlowNode | null {
    return nodes.find(n => n.type === 'trigger') || null;
}

export async function executeNode(
    supabase: any,
    execution: FlowExecution,
    flow: Flow,
    node: FlowNode,
    context: ExecutionContext,
    instance: any,
    evolutionApiUrl: string,
    evolutionApiKey: string,
    logFn: (level: string, message: string, data?: any) => Promise<void>
): Promise<{
    nextNodeId: string | null;
    updatedContext: ExecutionContext;
    shouldWait: boolean;
    waitConfig?: Record<string, any>;
    finished: boolean;
    finishStatus?: string;
}> {
    await logFn('debug', `Executing node: ${node.id} (${node.type})`, { nodeData: node.data });

    switch (node.type) {
        // ----------------
        // TRIGGER NODE
        // ----------------
        case 'trigger': {
            const nextNodeId = findNextNode(flow.edges, node.id);
            return { nextNodeId, updatedContext: context, shouldWait: false, finished: false };
        }

        // ----------------
        // MESSAGE NODE
        // ----------------
        case 'message': {
            const content = replaceVariables(node.data.content || '', context);
            const mediaUrl = node.data.mediaUrl ? replaceVariables(node.data.mediaUrl, context) : null;
            const delay = node.data.delay || 0;

            // Apply typing delay if configured
            if (delay > 0) {
                await new Promise(resolve => setTimeout(resolve, delay * 1000));
            }

            // Send message via Evolution API
            try {
                const remoteJid = context.contact?.remote_jid;
                if (!remoteJid) {
                    throw new Error('No remote_jid in context');
                }

                const normalizedNumber = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');

                if (mediaUrl) {
                    // Send media message
                    await fetch(`${evolutionApiUrl}/message/sendMedia/${instance.evolution_instance_id}`, {
                        method: 'POST',
                        headers: { 'apikey': evolutionApiKey, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            number: normalizedNumber,
                            mediatype: node.data.mediaType || 'image',
                            media: mediaUrl,
                            caption: content
                        })
                    });
                } else {
                    // Send text message
                    await fetch(`${evolutionApiUrl}/message/sendText/${instance.evolution_instance_id}`, {
                        method: 'POST',
                        headers: { 'apikey': evolutionApiKey, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            number: normalizedNumber,
                            text: content,
                            delay: 1200
                        })
                    });
                }

                await logFn('info', `Message sent: ${content.substring(0, 50)}...`);
            } catch (err: any) {
                await logFn('error', `Failed to send message: ${err.message}`);
                throw err;
            }

            const nextNodeId = findNextNode(flow.edges, node.id);
            return { nextNodeId, updatedContext: context, shouldWait: false, finished: false };
        }

        // ----------------
        // WAIT RESPONSE NODE
        // ----------------
        case 'waitResponse': {
            const variableName = node.data.variableName || 'user_response';
            const timeoutMinutes = node.data.timeoutMinutes || flow.config.default_timeout_minutes || 60;
            const validation = node.data.validation || null;

            const waitConfig = {
                variable_name: variableName,
                timeout_minutes: timeoutMinutes,
                validation: validation,
                timeout_node_id: node.data.timeoutNodeId || null
            };

            await logFn('info', `Waiting for response, will save to: ${variableName}`);

            return {
                nextNodeId: null,
                updatedContext: context,
                shouldWait: true,
                waitConfig,
                finished: false
            };
        }

        // ----------------
        // CONDITION NODE
        // ----------------
        case 'condition': {
            const conditions = node.data.conditions || [];
            const variable = node.data.variable || 'user_response';
            const value = context[variable] || '';
            const valueNorm = normalizeText(String(value));

            let matchedOutput = 'default';

            for (const cond of conditions) {
                const targetNorm = normalizeText(String(cond.value || ''));
                let matches = false;

                switch (cond.operator) {
                    case 'equals':
                        matches = valueNorm === targetNorm;
                        break;
                    case 'not_equals':
                        matches = valueNorm !== targetNorm;
                        break;
                    case 'contains':
                        matches = valueNorm.includes(targetNorm);
                        break;
                    case 'not_contains':
                        matches = !valueNorm.includes(targetNorm);
                        break;
                    case 'starts_with':
                        matches = valueNorm.startsWith(targetNorm);
                        break;
                    case 'ends_with':
                        matches = valueNorm.endsWith(targetNorm);
                        break;
                    case 'greater_than':
                        matches = parseFloat(value) > parseFloat(cond.value);
                        break;
                    case 'less_than':
                        matches = parseFloat(value) < parseFloat(cond.value);
                        break;
                    case 'is_empty':
                        matches = !value || value.length === 0;
                        break;
                    case 'is_not_empty':
                        matches = value && value.length > 0;
                        break;
                    case 'regex':
                        try {
                            matches = new RegExp(cond.value, 'i').test(String(value));
                        } catch { matches = false; }
                        break;
                }

                if (matches) {
                    matchedOutput = cond.output || cond.id || 'default';
                    break;
                }
            }

            await logFn('debug', `Condition evaluated: ${variable}="${value}" -> ${matchedOutput}`);

            const nextNodeId = findNextNode(flow.edges, node.id, matchedOutput);
            return { nextNodeId, updatedContext: context, shouldWait: false, finished: false };
        }

        // ----------------
        // ACTION NODE (CRM)
        // ----------------
        case 'action': {
            const actionType = node.data.actionType;

            try {
                switch (actionType) {
                    case 'add_tag': {
                        const tagName = replaceVariables(node.data.tagName || '', context);
                        // Find or create tag, then link to contact
                        const { data: tag } = await supabase
                            .from('tags')
                            .select('id')
                            .eq('company_id', flow.company_id)
                            .eq('name', tagName)
                            .single();

                        if (tag) {
                            await supabase
                                .from('contact_tags')
                                .upsert({ contact_id: execution.contact_id, tag_id: tag.id });
                        }
                        await logFn('info', `Added tag: ${tagName}`);
                        break;
                    }

                    case 'remove_tag': {
                        const tagName = replaceVariables(node.data.tagName || '', context);
                        const { data: tag } = await supabase
                            .from('tags')
                            .select('id')
                            .eq('company_id', flow.company_id)
                            .eq('name', tagName)
                            .single();

                        if (tag) {
                            await supabase
                                .from('contact_tags')
                                .delete()
                                .eq('contact_id', execution.contact_id)
                                .eq('tag_id', tag.id);
                        }
                        await logFn('info', `Removed tag: ${tagName}`);
                        break;
                    }

                    case 'update_lead': {
                        const field = node.data.field;
                        const value = replaceVariables(node.data.value || '', context);
                        // Find lead by contact phone
                        const { data: contact } = await supabase
                            .from('whatsapp_contacts')
                            .select('remote_jid')
                            .eq('id', execution.contact_id)
                            .single();

                        if (contact) {
                            const leadLookup = buildPhoneCandidates(contact.remote_jid);
                            if (leadLookup.length === 0) break;
                            await supabase
                                .from('leads')
                                .update({ [field]: value })
                                .eq('company_id', flow.company_id)
                                .in('telefone', leadLookup);
                        }
                        await logFn('info', `Updated lead field ${field}`);
                        break;
                    }

                    case 'notify_user': {
                        // Could send push notification, email, etc.
                        await logFn('info', `Notification action triggered`);
                        break;
                    }
                }
            } catch (err: any) {
                await logFn('error', `Action failed: ${err.message}`);
            }

            const nextNodeId = findNextNode(flow.edges, node.id);
            return { nextNodeId, updatedContext: context, shouldWait: false, finished: false };
        }

        // ----------------
        // DELAY NODE
        // ----------------
        case 'delay': {
            const delaySeconds = node.data.delaySeconds || 0;
            const delayMinutes = node.data.delayMinutes || 0;
            const totalDelay = (delaySeconds + delayMinutes * 60) * 1000;

            if (totalDelay > 0 && totalDelay <= 30000) {
                // Short delay - wait inline (Edge Functions have 30s limit)
                await new Promise(resolve => setTimeout(resolve, totalDelay));
            } else if (totalDelay > 30000) {
                // Long delay - would need scheduled job (not implemented in MVP)
                await logFn('warn', `Delay ${totalDelay}ms exceeds limit, skipping`);
            }

            const nextNodeId = findNextNode(flow.edges, node.id);
            return { nextNodeId, updatedContext: context, shouldWait: false, finished: false };
        }

        // ----------------
        // WEBHOOK NODE
        // ----------------
        case 'webhook': {
            const url = replaceVariables(node.data.url || '', context);
            const method = node.data.method || 'POST';
            const headers = node.data.headers || {};
            let body = node.data.body || '';

            if (typeof body === 'string') {
                body = replaceVariables(body, context);
            }

            try {
                const response = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json', ...headers },
                    body: method !== 'GET' ? JSON.stringify(JSON.parse(body)) : undefined
                });

                const responseData = await response.json();
                const saveAs = node.data.saveResponseAs || 'webhook_response';
                context[saveAs] = responseData;

                await logFn('info', `Webhook called: ${method} ${url}`, { status: response.status });
            } catch (err: any) {
                await logFn('error', `Webhook failed: ${err.message}`);
            }

            const nextNodeId = findNextNode(flow.edges, node.id);
            return { nextNodeId, updatedContext: context, shouldWait: false, finished: false };
        }

        // ----------------
        // RANDOM PATH NODE
        // ----------------
        case 'randomPath': {
            const paths = node.data.paths || [];
            if (paths.length === 0) {
                const nextNodeId = findNextNode(flow.edges, node.id);
                return { nextNodeId, updatedContext: context, shouldWait: false, finished: false };
            }

            // Weighted random selection
            const totalWeight = paths.reduce((sum: number, p: any) => sum + (p.weight || 1), 0);
            let random = Math.random() * totalWeight;
            let selectedOutput = paths[0].id;

            for (const path of paths) {
                random -= (path.weight || 1);
                if (random <= 0) {
                    selectedOutput = path.id;
                    break;
                }
            }

            const nextNodeId = findNextNode(flow.edges, node.id, selectedOutput);
            return { nextNodeId, updatedContext: context, shouldWait: false, finished: false };
        }

        // ----------------
        // END NODE
        // ----------------
        case 'end': {
            const finishStatus = node.data.finishStatus || 'completed';
            await logFn('info', `Flow ended: ${finishStatus}`);

            return {
                nextNodeId: null,
                updatedContext: context,
                shouldWait: false,
                finished: true,
                finishStatus
            };
        }

        default:
            await logFn('warn', `Unknown node type: ${node.type}`);
            const nextNodeId = findNextNode(flow.edges, node.id);
            return { nextNodeId, updatedContext: context, shouldWait: false, finished: false };
    }
}

// ============================================
// FLOW EXECUTION LOOP
// ============================================

export async function executeFlow(
    supabase: any,
    execution: FlowExecution,
    flow: Flow,
    startNodeId: string | null,
    context: ExecutionContext,
    instance: any,
    evolutionApiUrl: string,
    evolutionApiKey: string
): Promise<void> {
    const MAX_NODES = 100; // Prevent infinite loops
    let nodesExecuted = 0;
    let currentNodeId = startNodeId;
    let currentContext = { ...context };

    // Log function
    const logFn = async (level: string, message: string, data?: any) => {
        try {
            await supabase.from('automation_logs').insert({
                execution_id: execution.id,
                flow_id: flow.id,
                company_id: flow.company_id,
                level,
                message,
                data
            });
        } catch (e) {
            console.error('Failed to log:', e);
        }
    };

    while (currentNodeId && nodesExecuted < MAX_NODES) {
        nodesExecuted++;

        const node = flow.nodes.find(n => n.id === currentNodeId);
        if (!node) {
            await logFn('error', `Node not found: ${currentNodeId}`);
            break;
        }

        // Record entering node
        const nodeHistory = [...(execution.node_history || [])];
        nodeHistory.push({ node_id: node.id, entered_at: new Date().toISOString() });

        // Execute node
        const result = await executeNode(
            supabase,
            execution,
            flow,
            node,
            currentContext,
            instance,
            evolutionApiUrl,
            evolutionApiKey,
            logFn
        );

        // Update context
        currentContext = result.updatedContext;

        // Mark node exit
        if (nodeHistory.length > 0) {
            nodeHistory[nodeHistory.length - 1].exited_at = new Date().toISOString();
        }

        // Handle wait
        if (result.shouldWait) {
            const expiresAt = result.waitConfig?.timeout_minutes
                ? new Date(Date.now() + result.waitConfig.timeout_minutes * 60 * 1000).toISOString()
                : null;

            await supabase
                .from('automation_flow_executions')
                .update({
                    status: 'waiting_response',
                    current_node_id: currentNodeId,
                    context: currentContext,
                    wait_config: result.waitConfig,
                    node_history: nodeHistory,
                    last_activity_at: new Date().toISOString(),
                    expires_at: expiresAt
                })
                .eq('id', execution.id);

            return;
        }

        // Handle finish
        if (result.finished) {
            await supabase
                .from('automation_flow_executions')
                .update({
                    status: result.finishStatus || 'completed',
                    current_node_id: null,
                    context: currentContext,
                    node_history: nodeHistory,
                    last_activity_at: new Date().toISOString(),
                    completed_at: new Date().toISOString()
                })
                .eq('id', execution.id);

            // Update flow stats
            await supabase.rpc('increment_flow_stat', {
                p_flow_id: flow.id,
                p_stat: result.finishStatus === 'completed' ? 'success' : 'cancelled'
            });

            return;
        }

        // Update execution state
        await supabase
            .from('automation_flow_executions')
            .update({
                current_node_id: result.nextNodeId,
                context: currentContext,
                node_history: nodeHistory,
                last_activity_at: new Date().toISOString()
            })
            .eq('id', execution.id);

        currentNodeId = result.nextNodeId;
    }

    // If we exited without explicit end, mark as completed
    if (nodesExecuted >= MAX_NODES) {
        await logFn('error', 'Max nodes exceeded - possible infinite loop');
        await supabase
            .from('automation_flow_executions')
            .update({ status: 'failed', error_log: { message: 'Max nodes exceeded' } })
            .eq('id', execution.id);
    } else if (!currentNodeId) {
        await supabase
            .from('automation_flow_executions')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', execution.id);
    }
}

// ============================================
// START NEW FLOW
// ============================================

export async function startFlow(
    supabase: any,
    flow: Flow,
    trigger: FlowTrigger,
    contactId: string,
    chatId: string,
    instanceId: string,
    instance: any,
    contactData: any,
    evolutionApiUrl: string,
    evolutionApiKey: string
): Promise<void> {
    // Build initial context
    const context: ExecutionContext = {
        contact: {
            id: contactId,
            name: contactData.name || 'Unknown',
            phone: contactData.remote_jid?.replace('@s.whatsapp.net', '') || '',
            remote_jid: contactData.remote_jid
        },
        flow: {
            id: flow.id,
            name: flow.name
        }
    };

    // Find trigger node
    const triggerNode = flow.nodes.find(n => n.type === 'trigger');
    if (!triggerNode) {
        console.error('Flow has no trigger node');
        return;
    }

    // Create execution record
    const { data: execution, error } = await supabase
        .from('automation_flow_executions')
        .insert({
            flow_id: flow.id,
            contact_id: contactId,
            chat_id: chatId,
            instance_id: instanceId,
            status: 'running',
            current_node_id: triggerNode.id,
            context,
            trigger_type: trigger.type,
            trigger_data: { trigger_id: trigger.id }
        })
        .select()
        .single();

    if (error || !execution) {
        console.error('Failed to create execution:', error);
        return;
    }

    // Update flow stats
    await supabase
        .from('automation_flows')
        .update({
            execution_stats: {
                ...flow.execution_stats,
                total: (flow.execution_stats?.total || 0) + 1
            }
        })
        .eq('id', flow.id);

    // Execute flow starting from trigger
    await executeFlow(
        supabase,
        execution,
        flow,
        triggerNode.id,
        context,
        instance,
        evolutionApiUrl,
        evolutionApiKey
    );
}

// ============================================
// CONTINUE WAITING EXECUTION
// ============================================

export async function continueExecution(
    supabase: any,
    execution: FlowExecution,
    flow: Flow,
    userMessage: string,
    instance: any,
    evolutionApiUrl: string,
    evolutionApiKey: string
): Promise<void> {
    // Get the wait config
    const waitConfig = execution.wait_config;
    if (!waitConfig) {
        console.error('No wait config in execution');
        return;
    }

    // Save user's response to context
    const variableName = waitConfig.variable_name || 'user_response';
    const updatedContext = {
        ...execution.context,
        [variableName]: userMessage,
        last_response: userMessage
    };

    // Find the next node after the wait node
    const currentNode = flow.nodes.find(n => n.id === execution.current_node_id);
    if (!currentNode) {
        console.error('Current node not found');
        return;
    }

    const nextNodeId = flow.edges.find(e => e.source === currentNode.id)?.target || null;

    // Update execution to running
    await supabase
        .from('automation_flow_executions')
        .update({
            status: 'running',
            context: updatedContext,
            wait_config: null,
            last_activity_at: new Date().toISOString()
        })
        .eq('id', execution.id);

    // Continue execution from next node
    if (nextNodeId) {
        await executeFlow(
            supabase,
            { ...execution, context: updatedContext },
            flow,
            nextNodeId,
            updatedContext,
            instance,
            evolutionApiUrl,
            evolutionApiKey
        );
    }
}
