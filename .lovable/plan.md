

## Permettre de générer des relances facilement

### Problème actuel

Le bouton "Générer une relance" existe déjà sur la fiche prospect, mais il est **caché** :
- Il ne s'affiche que si le statut = "Contacté·e"
- ET si le dernier message date d'au moins 7 jours

Sur la fiche que tu regardes, le statut n'est probablement pas "Contacté·e", donc le bouton n'apparaît pas. De plus, même quand il apparaît, il renvoie vers la même page de génération qu'un premier message — il ne génère pas vraiment une vraie relance qui tient compte du message déjà envoyé.

### Ce qu'on va faire

**1. Toujours rendre la relance accessible**
- Sur la fiche prospect, ajouter un bouton "Générer une relance" à côté de chaque message dans l'historique (icône RefreshCw + "Relancer")
- Le bouton apparaît dès qu'au moins un message a été envoyé, sans contrainte de délai ni de statut
- Garder le bouton actuel en bas de page mais le rendre toujours visible si ≥ 1 message existe

**2. Vraie page de génération de relance**
- Nouvelle route `/prospects/:id/generate-relance/:messageId`
- Page qui pré-affiche le message original (envoyé) en encart "Message précédent"
- Champs adaptés à la relance :
  - Tonalité : doux (rappel léger) / direct (réponse claire demandée) / dernière tentative
  - Note contextuelle optionnelle (ex : "ils ont vu mais pas répondu", "je les ai recroisés depuis")
  - Canal (pré-rempli avec celui du message original)
- Bouton "Générer la relance"

**3. Edge function `generate-relance`**
- Nouvelle fonction (ou extension de `generate-prospection-message` avec un mode `relance`)
- Reçoit : prospect_id, message_id_original, tonalite, note_contextuelle, canal
- Construit un prompt Claude qui :
  - Reprend la fiche d'immersion du prospect
  - Inclut le contenu du message initial déjà envoyé
  - Demande une relance courte, naturelle, qui ne paraphrase pas le premier message
  - Adapte la tonalité demandée
- Sauvegarde le message en base avec `type = "relance"` (déjà géré dans `TYPE_BADGE_COLORS`)
- Met à jour le statut du prospect en `relance`

**4. Affichage**
- Le badge "relance" est déjà stylé (ambre) dans l'historique des messages
- La page `ProspectMessage` affichera correctement la relance générée (réutilise l'existant)

### Détails techniques

**Fichiers modifiés**
- `src/pages/ProspectDetail.tsx` : ajouter bouton "Relancer" sur chaque ligne de l'historique des messages, et toujours afficher le bouton en bas si messages.length > 0
- `src/App.tsx` : nouvelle route `/prospects/:id/generate-relance/:messageId`

**Fichiers créés**
- `src/pages/GenerateRelance.tsx` : nouvelle page de génération de relance (inspirée de `GenerateMessage.tsx`)
- `supabase/functions/generate-relance/index.ts` : nouvelle edge function avec son propre prompt orienté relance

**Base de données**
- Aucune migration nécessaire. La table `messages` a déjà un champ `type` qui acceptera `"relance"`.

**Prompt Claude relance — principes**
- Référence implicite au premier message ("comme évoqué", "pour reprendre notre échange")
- Pas de répétition du pitch complet
- Court (50-100 mots email, 50 mots LinkedIn/Insta)
- Tonalité ajustée selon le choix
- Pas de pression, pas de "dernier rappel" agressif sauf mode "dernière tentative"

### Vérification

Après implémentation :
- Sur une fiche prospect avec ≥ 1 message, le bouton "Relancer" apparaît à côté de chaque message
- Cliquer dessus ouvre la page de génération de relance avec le message original visible
- La relance générée s'enregistre avec `type = "relance"` et apparaît avec le badge ambre dans l'historique
- Le statut du prospect passe automatiquement à "Relancé·e"

