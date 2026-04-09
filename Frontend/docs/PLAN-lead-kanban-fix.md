# Lead Management & Kanban Fix

## Objetivo
Permitir que usuários salvem informações/descrições em contatos/leads e garantir que leads novos apareçam na primeira coluna do Kanban corretamente.

## User Review Required

> [!IMPORTANT]
> **Decisão sobre campo `notas`:** O banco define `notas` como `string[]` (array), mas o formulário atual trata como `string`. Vou manter como `string` no formulário e ajustar a lógica de salvamento para ser compatível. Se preferir array, me avise.

> [!WARNING]
> **Mudança no webhook:** Leads criados via WhatsApp passarão a usar o status padrão da empresa (ex: "Novos") ao invés de "novo" minúsculo. Isso corrige o Kanban mas precisa redeploy da Edge Function.

---

## Problemas Identificados

| Problema | Arquivo | Linha |
|----------|---------|-------|
| Status 'novo' (minúsculo) vs 'Novos' (Kanban) | `whatsapp-webhook/index.ts` | 599 |
| Campo `description` não editável | `LeadModal.tsx` | N/A |
| Campo `tags` não editável | `LeadModal.tsx` | N/A |
| Tipo `notas` inconsistente (string[] vs string) | `LeadModal.tsx` / DB | 54, 618 |

---

## Proposed Changes

### Backend - Edge Function

#### [MODIFY] [index.ts](file:///c:/Users/group/Desktop/dev-lyn/lyn-crm/supabase/functions/whatsapp-webhook/index.ts)

1. Na função `handleLeadUpsert`, buscar o `status_type` da empresa antes de criar o lead
2. Usar o primeiro valor de `status_type` ou fallback para "Novos"

```diff
async function handleLeadUpsert(...) {
+   // Fetch company default status
+   const { data: company } = await supabase
+       .from("company")
+       .select("status_type")
+       .eq("id", instance.company_id)
+       .single();
+   const defaultStatus = company?.status_type?.[0] || 'Novos';

    // ...existing code...

    await supabase
        .from("leads")
        .insert({
            company_id: instance.company_id,
            telefone: remoteJid,
            nome: pushName || remoteJid.replace('@s.whatsapp.net', ''),
-           status: 'novo',
+           status: defaultStatus,
            source: 'whatsapp',
            // ...
        });
}
```

---

### Frontend - LeadModal

#### [MODIFY] [LeadModal.tsx](file:///c:/Users/group/Desktop/dev-lyn/lyn-crm/src/components/dashboard/LeadModal.tsx)

1. **Adicionar campo `description`** (Textarea para descrição do lead)
2. **Adicionar campo `tags`** (Input com chips/badges para tags)
3. **Ajustar tratamento de `notas`** para compatibilidade com banco (array)

**Schema Zod atualizado:**
```typescript
const leadSchema = z.object({
  // ...existing fields...
  description: z.string().trim().max(2000).optional(),
  tags: z.array(z.string()).optional(),
  notas: z.string().trim().max(1000).optional(), // Keep as string in form
});
```

**Novo FormField para Description:**
```tsx
<FormField
  control={form.control}
  name="description"
  render={({ field }) => (
    <FormItem className="sm:col-span-2">
      <FormLabel>Descrição</FormLabel>
      <FormControl>
        <Textarea
          placeholder="Descreva o lead/oportunidade..."
          className="resize-none"
          rows={3}
          {...field}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Novo FormField para Tags:**
```tsx
<FormField
  control={form.control}
  name="tags"
  render={({ field }) => (
    <FormItem className="sm:col-span-2">
      <FormLabel>Tags</FormLabel>
      <FormControl>
        <TagInput
          value={field.value || []}
          onChange={field.onChange}
          placeholder="Digite e pressione Enter..."
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

---

### Frontend - Componente TagInput (Novo)

#### [NEW] [TagInput.tsx](file:///c:/Users/group/Desktop/dev-lyn/lyn-crm/src/components/ui/TagInput.tsx)

Componente reutilizável para entrada de múltiplas tags com chips deletáveis.

---

### Frontend - LeadDetailsPanel

#### [MODIFY] [LeadDetailsPanel.tsx](file:///c:/Users/group/Desktop/dev-lyn/lyn-crm/src/components/dashboard/LeadDetailsPanel.tsx)

1. Exibir campo `description` na visualização do lead
2. Exibir `tags` como badges

---

## Tasks

- [ ] Modificar `whatsapp-webhook/index.ts` para usar status correto → Verify: Lead criado via WA aparece em "Novos"
- [ ] Criar componente `TagInput.tsx` → Verify: Componente renderiza sem erros
- [ ] Adicionar campos `description` e `tags` no `LeadModal.tsx` → Verify: Campos aparecem no modal
- [ ] Atualizar `handleSubmit` para salvar description e tags → Verify: Dados salvos no banco
- [ ] Atualizar `LeadDetailsPanel.tsx` para exibir description e tags → Verify: Dados exibidos corretamente
- [ ] Redeploy Edge Function `whatsapp-webhook` → Verify: Função ativa sem erros

---

## Verification Plan

### Automated Tests
- Verificar build: `npm run build`
- Verificar tipos: `npx tsc --noEmit`

### Manual Verification
1. Criar lead manualmente com description e tags
2. Verificar que dados são salvos e exibidos corretamente
3. Simular webhook de WhatsApp (ou enviar mensagem real)
4. Verificar que lead aparece na primeira coluna do Kanban
5. Mover lead entre colunas do Kanban

---

## Done When
- [ ] Leads criados via WhatsApp aparecem na primeira coluna do Kanban
- [ ] Campo "Descrição" editável e persistido
- [ ] Campo "Tags" editável e persistido
- [ ] Notas funcionando corretamente
