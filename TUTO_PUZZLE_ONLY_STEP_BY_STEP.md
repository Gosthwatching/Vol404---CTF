# Tuto pas a pas: coder seulement le puzzle (sans quiz, sans flag)

## Contexte global de ton app (vision finale)
Tu veux ce flow final:
1. Le joueur valide un premier flag.
2. Cela debloque la derniere etape: puzzle + questionnaire.
3. A la fin, le joueur trouve un deuxieme flag.
4. Il entre ce deuxieme flag pour terminer l'app.

Important:
Pour l'instant, on ne code QUE le jeu puzzle.
Pas de questionnaire.
Pas de validation de flag final.

---

## Objectif de ce tuto
A la fin de ce tuto, tu auras un puzzle jouable avec:
1. des images d'indices (vrais + faux)
2. une cle cachee
3. une verification de cle
4. une reconstruction de chemin
5. un etat puzzle reussi ou echoue

---

## Regles de travail (pour apprendre vite)
1. Une petite etape a la fois.
2. Tu testes a chaque etape.
3. Tu ne passes a l'etape suivante que si la precedente marche.
4. Tu ecris la logique avant le style.

---

## Etape 0 - Preparation mentale (5 min)
Avant de coder, ecris ces decisions:
1. Nom de la page puzzle.
2. Nombre d'indices (recommande: 7).
3. Nombre de faux indices (recommande: 2).
4. Quelle est la cle attendue.
5. Quel est le chemin final attendu.

Exemple de structure de pensee:
- Indices utilises pour construire un chemin
- Une cle qui autorise la validation
- Une condition de victoire claire

---

## Etape 1 - Construire l'ecran puzzle (HTML uniquement)
But:
Avoir une page visible avec des zones vides prêtes pour la logique.

A faire:
1. Crée une section titre + consigne.
2. Crée une grille pour afficher les images.
3. Crée un champ pour saisir la cle.
4. Crée un bouton "Verifier la cle".
5. Crée un champ pour saisir le chemin final.
6. Crée un bouton "Valider le chemin".
7. Crée une zone message (succes/erreur).

Critere de reussite:
La page s'affiche correctement et tous les elements sont presents.

---

## Etape 2 - Definir les donnees du puzzle (JS, sans logique complexe)
But:
Centraliser les donnees du puzzle dans un seul objet/tableau.

A faire:
1. Definis la liste des indices (id, type, vrai/faux, fragment).
2. Definis la cle attendue.
3. Definis le chemin final attendu.
4. Definis un objet state du jeu.

Le state minimum:
1. keyValidated (true/false)
2. discoveredClues (liste)
3. currentPathInput
4. puzzleCompleted (true/false)
5. attempts (compteur)

Critere de reussite:
Tu peux afficher en console tes donnees et ton state.

---

## Etape 3 - Afficher les indices dans la grille
But:
Rendre le puzzle visible avec des cartes cliquables.

A faire:
1. Parcourir la liste d'indices.
2. Creer une carte par indice.
3. Afficher image + label.
4. Ajouter un clic sur chaque carte.

Comportement attendu au clic:
1. Si indice vrai: ajouter son fragment dans discoveredClues.
2. Si indice faux: afficher un message piege.
3. Empêcher les doublons si on reclique la meme carte.

Critere de reussite:
Quand tu cliques, le state change correctement.

---

## Etape 4 - Validation de la cle
But:
Le joueur doit prouver qu'il a trouve la bonne cle.

A faire:
1. Lire la valeur du champ cle.
2. Normaliser (trim + lowercase ou uppercase selon ton choix).
3. Comparer a la cle attendue.
4. Si OK: keyValidated = true et message succes.
5. Sinon: message erreur sans spoiler.

Regle:
Sans cle validee, impossible de valider le chemin.

Critere de reussite:
Bonne cle => etat debloque.
Mauvaise cle => etat bloque.

---

## Etape 5 - Reconstruction du chemin
But:
Le joueur assemble ses fragments pour former le chemin.

A faire:
1. Definir clairement la regle d'assemblage (ordre fixe ou libre).
2. Lire le champ chemin.
3. Normaliser la saisie.
4. Comparer au chemin attendu.

Validation stricte:
1. Si cle non validee: refuser direct.
2. Si chemin incorrect: message precis mais court.
3. Si chemin correct: puzzleCompleted = true.

Critere de reussite:
Le puzzle passe a termine seulement si cle + chemin sont corrects.

---

## Etape 6 - Messages UX minimum
But:
Aider le joueur sans lui donner la solution.

Ajoute des messages pour:
1. clic indice vrai
2. clic indice faux
3. cle invalide
4. cle valide
5. chemin invalide
6. puzzle termine

Regle:
Un seul endroit d'affichage des messages pour garder l'UI propre.

---

## Etape 7 - Bloquer les erreurs de logique
But:
Eviter les bypass evidents.

A faire:
1. Ne pas valider chemin si keyValidated = false.
2. Ne pas compter deux fois le meme indice.
3. Bloquer les actions si puzzleCompleted = true.
4. Compter les tentatives (utile pour debug).

Critere de reussite:
Tu ne peux pas "forcer" la victoire via un ordre incorrect d'actions.

---

## Etape 8 - Checklist de tests manuels (obligatoire)
Teste exactement ces cas:
1. Ouvrir la page: tout charge.
2. Cliquer un faux indice: message piege.
3. Cliquer un vrai indice: fragment enregistre.
4. Recliquer le meme indice: pas de doublon.
5. Mauvaise cle: refuse.
6. Bonne cle: debloque.
7. Bonne cle + mauvais chemin: refuse.
8. Bonne cle + bon chemin: succes puzzle.
9. Apres succes: plus de modifications non voulues.

---

## Quand on passera a l'etape suivante (pas maintenant)
Une fois ce puzzle stable, on branchera:
1. l'ouverture du questionnaire
2. la validation finale avec deuxieme flag

Mais pour l'instant, ton Definition of Done est simple:
- Le puzzle seul fonctionne de bout en bout.

---

## Plan de pair-programming (toi + moi)
On peut avancer en 4 sessions courtes:
1. Session A: Etape 1 + Etape 2
2. Session B: Etape 3 + Etape 4
3. Session C: Etape 5 + Etape 6
4. Session D: Etape 7 + Etape 8

A chaque session:
1. Tu codes.
2. Tu me montres ce que tu as fait.
3. Je te corrige la logique (sans faire a ta place si tu veux apprendre).

Tu peux commencer tout de suite par Session A.
