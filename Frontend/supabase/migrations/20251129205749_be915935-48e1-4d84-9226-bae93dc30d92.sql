-- Reverter todas as políticas da tabela company e restaurar versão simples

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "Users can access their company" ON public.company;
DROP POLICY IF EXISTS "Superadmins can view all companies" ON public.company;
DROP POLICY IF EXISTS "Admins can update own company" ON public.company;
DROP POLICY IF EXISTS "Superadmins can insert companies" ON public.company;
DROP POLICY IF EXISTS "Allow inserts for authenticated" ON public.company;
DROP POLICY IF EXISTS "Users can update own company" ON public.company;
DROP POLICY IF EXISTS "Users can access only their own company" ON public.company;

-- Criar política simples de leitura
CREATE POLICY "Users can access their company"
  ON public.company
  FOR SELECT
  USING (
    id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Criar política simples de inserção
CREATE POLICY "Allow inserts for authenticated"
  ON public.company
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Criar política simples de atualização
CREATE POLICY "Users can update own company"
  ON public.company
  FOR UPDATE
  USING (
    id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );