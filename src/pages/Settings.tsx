import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

interface ProfileData {
  nom: string;
  role: string;
  pitch: string;
  specialite: string;
  site_web: string;
  linkedin: string;
  preuves_sociales: string;
  references_formation: string;
  signature_email: string;
}

const emptyProfile: ProfileData = {
  nom: "",
  role: "",
  pitch: "",
  specialite: "",
  site_web: "",
  linkedin: "",
  preuves_sociales: "",
  references_formation: "",
  signature_email: "",
};

const Settings = () => {
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("my_profile")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setProfile({
        nom: data.nom || "",
        role: data.role || "",
        pitch: data.pitch || "",
        specialite: data.specialite || "",
        site_web: data.site_web || "",
        linkedin: data.linkedin || "",
        preuves_sociales: data.preuves_sociales || "",
        references_formation: data.references_formation || "",
        signature_email: data.signature_email || "",
      });
    }
    if (error) toast.error(error.message);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if profile exists
    const { data: existing } = await supabase
      .from("my_profile")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("my_profile")
        .update(profile)
        .eq("user_id", user.id));
    } else {
      ({ error } = await supabase
        .from("my_profile")
        .insert({ ...profile, user_id: user.id }));
    }

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Profil sauvegardé");
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const updateField = (field: keyof ProfileData, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  const fields: { key: keyof ProfileData; label: string; type: "input" | "textarea" }[] = [
    { key: "nom", label: "Nom complet", type: "input" },
    { key: "role", label: "Rôle / Titre", type: "input" },
    { key: "specialite", label: "Spécialité", type: "input" },
    { key: "site_web", label: "Site web", type: "input" },
    { key: "linkedin", label: "LinkedIn", type: "input" },
    { key: "pitch", label: "Pitch", type: "textarea" },
    { key: "preuves_sociales", label: "Preuves sociales", type: "textarea" },
    { key: "references_formation", label: "Références formation", type: "textarea" },
    { key: "signature_email", label: "Signature email", type: "textarea" },
  ];

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-xl animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl">Mon profil</h1>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </Button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {fields.map(({ key, label, type }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key}>{label}</Label>
              {type === "input" ? (
                <Input
                  id={key}
                  value={profile[key]}
                  onChange={(e) => updateField(key, e.target.value)}
                />
              ) : (
                <Textarea
                  id={key}
                  value={profile[key]}
                  onChange={(e) => updateField(key, e.target.value)}
                  rows={3}
                />
              )}
            </div>
          ))}

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Sauvegarde…" : "Sauvegarder"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Settings;
