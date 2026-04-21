## Caler les relances sur ton style réel

### Ce que tu fais d'habitude (analyse de ton exemple)

Ta relance suit une structure très claire en **5 mouvements courts** :

1. **Salutation collective** — "Bonjour à toute l'équipe du [structure]"
2. **Phrase de relance directe** — "Je vous recontacte suite à mon dernier message."
3. **Question douce qui reformule l'enjeu** — "J'imagine que vous êtes débordés, mais je voulais savoir si l'idée de [X] vous intéresserait."
4. **Mini re-présentation** (1-2 phrases) — "Je m'appelle Laetitia Mattioli, je suis fondatrice de Nowadays Agency. J'accompagne…"
5. **Proposition concrète + signature** — "Si ça vous parle, je suis disponible pour un échange de 30 minutes en visio la semaine prochaine."

Le ton est : **bienveillant, sans pression, direct, sans formule creuse**, avec une **mini-représentation assumée** (parce que la personne a peut-être oublié le premier message).

Aujourd'hui, mon prompt actuel **interdit la re-présentation** ("pas de pitch, pas de présentation longue") — c'est l'inverse de ce que tu fais. Il faut le corriger.

### Ce qu'on va changer

**Refonte du prompt `generate-relance**` pour reproduire ton style :

- **Structure imposée en 5 mouvements** (les 5 ci-dessus), explicitement décrits dans le prompt
- **Salutation** : "Bonjour à toute l'équipe du [entreprise]" par défaut (collectif), sauf si un prénom de contact est connu et qu'il a été utilisé dans le 1er message 
- **Mini re-présentation autorisée et encouragée** : 1-2 phrases reprenant l'essentiel du pitch profil (Nowadays Agency, ce qu'on accompagne) — pas un pitch complet, juste un rappel
- **Reformulation de l'enjeu sous forme de question** : "je voulais savoir si l'idée de [thème principal du 1er message] vous intéresserait"
- **Proposition concrète à la fin** : créneau visio 30 min la semaine prochaine (par défaut), adaptable selon tonalité
- **Signature** : "Bonne journée à vous, [prénom]" — pas la signature email complète qui rallongerait inutilement
- **Longueur cible** : 80-120 mots (un peu plus généreux qu'avant pour permettre la mini-présentation)
- **Exemple en few-shot** dans le prompt : on donne ton email exact à Claude comme référence de style

**Adaptation par tonalité** :

- **Doux** → ton exemple tel quel, "j'imagine que vous êtes débordés"
- **Direct** → on enlève le "j'imagine que vous êtes débordés", on demande clairement un retour
- **Dernière tentative** → on ferme proprement : "je n'insisterai pas davantage, mais la porte reste ouverte si l'idée mûrit"

**Adaptation par canal** :

- **Email** → structure complète avec objet ("On en reparle ?", "Petite relance", etc.)
- **LinkedIn / Instagram** → pas d'objet, version condensée (60-70 mots), salutation individualisée si possible

### Détails techniques

**Fichier modifié** : `supabase/functions/generate-relance/index.ts`

- Réécriture complète du `prompt` avec structure imposée + few-shot example
- Injection plus riche du `my_profile` (pitch, spécialité) pour nourrir la mini-représentation
- Gestion fine signature courte vs `signature_email` selon le canal

**Pas de migration DB ni de changement front** — tout se passe dans le prompt de l'edge function.

### Vérification

Après déploiement, générer une relance "doux/email" sur un prospect existant et comparer avec ton exemple : on doit retrouver la salutation collective, la phrase d'ouverture quasi identique, la mini-présentation Nowadays, et la proposition de visio 30 min.