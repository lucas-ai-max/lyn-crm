// Leads service — CRUD via Supabase
import { supabase } from "../config/supabase.js";

export async function list(companyId, filters = {}) {
  let query = supabase
    .from("lyn_leads")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.source) query = query.eq("source", filters.source);
  if (filters.pipeline_id) query = query.eq("pipeline_id", filters.pipeline_id);
  if (filters.stage_id) query = query.eq("stage_id", filters.stage_id);
  if (filters.responsavel_id) query = query.eq("responsavel_id", filters.responsavel_id);
  if (filters.search) query = query.ilike("nome", `%${filters.search}%`);
  if (filters.limit) query = query.limit(filters.limit);
  if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function getById(id) {
  const { data, error } = await supabase
    .from("lyn_leads")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function create(lead) {
  const { data, error } = await supabase
    .from("lyn_leads")
    .insert(lead)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function update(id, updates) {
  const { data, error } = await supabase
    .from("lyn_leads")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id) {
  const { error } = await supabase
    .from("lyn_leads")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  return true;
}
