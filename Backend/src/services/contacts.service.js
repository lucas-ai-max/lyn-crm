// Contacts service — CRUD via Supabase
import { supabase } from "../config/supabase.js";

export async function list(companyId, filters = {}) {
  let query = supabase
    .from("lyn_contacts")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (filters.search) {
    query = query.or(`nome.ilike.%${filters.search}%,email.ilike.%${filters.search}%,telefone.ilike.%${filters.search}%`);
  }
  if (filters.source) query = query.eq("source", filters.source);
  if (filters.segmento) query = query.eq("segmento", filters.segmento);
  if (filters.tags) query = query.contains("tags", [filters.tags]);
  if (filters.limit) query = query.limit(filters.limit);
  if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function getById(id) {
  const { data, error } = await supabase
    .from("lyn_contacts")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function create(contact) {
  const { data, error } = await supabase
    .from("lyn_contacts")
    .insert(contact)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function update(id, updates) {
  updates.updated_at = new Date().toISOString();
  const { data, error } = await supabase
    .from("lyn_contacts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id) {
  const { error } = await supabase
    .from("lyn_contacts")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  return true;
}

export async function findOrCreate(contact) {
  const { company_id, email, telefone, nome } = contact;
  if (!company_id || !nome) throw new Error("company_id and nome required");

  // Try to find existing by email or telefone
  let query = supabase
    .from("lyn_contacts")
    .select("*")
    .eq("company_id", company_id);

  if (email) {
    const { data } = await query.ilike("email", email).maybeSingle();
    if (data) return { data, created: false };
  }

  if (telefone) {
    const { data } = await supabase
      .from("lyn_contacts")
      .select("*")
      .eq("company_id", company_id)
      .eq("telefone", telefone)
      .maybeSingle();
    if (data) return { data, created: false };
  }

  // Not found — create
  const { data, error } = await supabase
    .from("lyn_contacts")
    .insert(contact)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { data, created: true };
}

export async function getLeads(contactId) {
  const { data, error } = await supabase
    .from("lyn_leads")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}
