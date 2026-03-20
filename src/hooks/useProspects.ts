import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Prospect {
  id: string;
  user_id: string;
  nom: string | null;
  entreprise: string | null;
  poste: string | null;
  email: string | null;
  linkedin: string | null;
  secteur: string | null;
  taille_entreprise: string | null;
  statut: string | null;
  notes: string | null;
  score_ia: number | null;
  recherche_ia: any;
  created_at: string;
  updated_at: string;
}

export const useProspects = () => {
  return useQuery({
    queryKey: ["prospects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospects")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Prospect[];
    },
  });
};

export const useUpdateProspectStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: string }) => {
      const { error } = await supabase
        .from("prospects")
        .update({ statut })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
    },
  });
};

export const useCreateProspect = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (prospect: Partial<Prospect>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("prospects")
        .insert({ ...prospect, user_id: user.id, statut: prospect.statut || "a_rechercher" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
    },
  });
};
