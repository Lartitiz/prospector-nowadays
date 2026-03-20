import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateProspect } from "@/hooks/useProspects";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const NewProspectDialog = () => {
  const [open, setOpen] = useState(false);
  const [nom, setNom] = useState("");
  const [entreprise, setEntreprise] = useState("");
  const [poste, setPoste] = useState("");
  const [email, setEmail] = useState("");
  const createProspect = useCreateProspect();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProspect.mutate(
      { nom, entreprise, poste, email },
      {
        onSuccess: () => {
          toast.success("Prospect ajouté");
          setOpen(false);
          setNom("");
          setEntreprise("");
          setPoste("");
          setEmail("");
        },
        onError: () => toast.error("Erreur lors de la création"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nouveau prospect
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau prospect</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="np-entreprise">Structure</Label>
            <Input id="np-entreprise" value={entreprise} onChange={(e) => setEntreprise(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-nom">Nom du contact</Label>
            <Input id="np-nom" value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-poste">Poste</Label>
            <Input id="np-poste" value={poste} onChange={(e) => setPoste(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-email">Email</Label>
            <Input id="np-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={createProspect.isPending}>
            {createProspect.isPending ? "Création…" : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewProspectDialog;
