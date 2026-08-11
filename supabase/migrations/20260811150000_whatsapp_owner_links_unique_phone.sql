-- Un mismo número de WhatsApp no puede quedar vinculado como "owner" de más
-- de un negocio a la vez. Sin esto, dos negocios podrían registrar el mismo
-- número y el webhook (findOwnerLink) no tendría forma confiable de saber a
-- cuál de los dos responder -- riesgo de responder con datos del negocio
-- equivocado.
--
-- Se usa un índice único parcial (solo sobre filas active = true) en vez de
-- un UNIQUE constraint simple, para permitir que un dueño desvincule un
-- número (active = false, soft-delete futuro) y otro negocio lo reclame
-- después sin dejar basura bloqueando el índice.

DROP INDEX IF EXISTS public.idx_whatsapp_owner_links_phone_unique_active;

CREATE UNIQUE INDEX idx_whatsapp_owner_links_phone_unique_active
  ON public.whatsapp_owner_links (owner_phone_number)
  WHERE active = true;
