-- Create update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- my_profile table (single row for Laetitia)
CREATE TABLE public.my_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom TEXT,
  role TEXT,
  pitch TEXT,
  specialite TEXT,
  site_web TEXT,
  linkedin TEXT,
  preuves_sociales TEXT,
  references_formation TEXT,
  signature_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.my_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated user can do everything" ON public.my_profile
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE TRIGGER update_my_profile_updated_at
  BEFORE UPDATE ON public.my_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- prospects table
CREATE TABLE public.prospects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom TEXT,
  entreprise TEXT,
  poste TEXT,
  email TEXT,
  linkedin TEXT,
  secteur TEXT,
  taille_entreprise TEXT,
  statut TEXT DEFAULT 'nouveau',
  notes TEXT,
  score_ia INTEGER,
  recherche_ia JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated user can do everything" ON public.prospects
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE TRIGGER update_prospects_updated_at
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  sujet TEXT,
  contenu TEXT,
  type TEXT DEFAULT 'email',
  statut TEXT DEFAULT 'brouillon',
  genere_par_ia BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated user can do everything" ON public.messages
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();