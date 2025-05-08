-- Function to clear referential associations
CREATE OR REPLACE FUNCTION public.clear_referential_associations(ref_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.entities
  SET referential_id = NULL
  WHERE referential_id = ref_id;
END;
$$;

-- Function to set entity referential
CREATE OR REPLACE FUNCTION public.set_entity_referential(entity_id uuid, ref_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.entities
  SET referential_id = ref_id
  WHERE id = entity_id;
END;
$$;
