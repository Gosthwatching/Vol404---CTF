# Tuto simple: creer un puzzle JavaScript pour ton CTF (sans code)

## Ce que tu vas construire
Un puzzle qui fait partie du CTF:
1. Le joueur doit avoir fait les prerequis CTF.
2. Il resolvra un puzzle d'indices (vrais + faux).
3. Il trouvera une cle cachee (image/audio).
4. Il reconstituera un chemin final.
5. Il passera un quiz de 3 questions tirees parmi 5.
6. Si valide, il debloquera le flag.

## Regle la plus importante
Le puzzle n'est pas un bonus.
Le puzzle est une etape obligatoire avant le flag.

---

## Etape 1: definir ton scenario en 10 minutes
Ecris ces 5 points sur papier:
1. Ou commence le puzzle dans ton CTF.
2. Quels prerequis doivent etre valides avant acces.
3. Quelle est la cle cachee.
4. Quel chemin final doit etre trouve.
5. Quel score mini valide le quiz.

Si tu ne peux pas repondre clairement a ces 5 points, ne code pas encore.

---

## Etape 2: preparer les elements du puzzle
Prepare:
1. 7 a 10 images d'indices.
2. 1 media pour la cle (audio ou image).
3. 5 questions de quiz (1 par grande etape CTF).

Pour chaque image, decide:
1. vrai indice ou faux indice
2. a quelle etape CTF elle correspond
3. quel fragment elle donne pour le chemin final

Regle pratique:
Au moins 30% des indices doivent etre faux mais credibles.

---

## Etape 3: definir le flow utilisateur
Ton flow doit etre strictement dans cet ordre:
1. Controle prerequis CTF
2. Ecran puzzle
3. Validation de la cle
4. Validation du chemin
5. Quiz 3/5
6. Resultat + feedback
7. Confirmation de fin
8. Acces flag

Si une etape echoue, on reste sur cette etape.

---

## Etape 4: definir le state (tres important)
Ton state doit contenir au minimum:
1. prerequis valides ou non
2. indices vus
3. cle validee ou non
4. chemin propose
5. chemin valide ou non
6. questions tirees
7. reponses utilisateur
8. score
9. puzzle termine
10. ctf termine

Objectif:
Eviter les bugs de progression et les bypass.

---

## Etape 5: regles de validation
Validation 1: acces puzzle
Le joueur entre seulement si prerequis CTF OK.

Validation 2: cle
Si cle incorrecte: message simple, pas de spoiler.

Validation 3: chemin
Comparer une version normalisee (casse/espaces).

Validation 4: quiz
Tirer 3 questions uniques parmi 5.

Validation 5: fin
Confirmation explicite avant de marquer la partie terminee.

---

## Etape 6: quiz clair et utile
Conseille:
1. 5 questions totales.
2. 4 choix max par question.
3. 1 bonne reponse.
4. feedback court pour chaque reponse.

Seuil recommande:
2/3 minimum pour valider.

---

## Etape 7: anti-contournement (obligatoire en CTF)
A imposer:
1. Pas d'acces direct au flag sans puzzle + quiz valides.
2. Pas de quiz si chemin non valide.
3. Pas de validation finale sans confirmation.
4. Si partie terminee: pas de relance de validation.

---

## Etape 8: plan de test rapide
Teste dans cet ordre:
1. utilisateur sans prerequis -> acces puzzle refuse
2. prerequis OK -> acces puzzle autorise
3. mauvaise cle -> refuse
4. bonne cle -> etape suivante
5. mauvais chemin -> refuse
6. bon chemin -> quiz ouvert
7. quiz < seuil -> refuse
8. quiz >= seuil -> valide
9. confirmation fin -> partie terminee
10. acces flag -> autorise seulement si tout est valide

---

## Check-list finale (Definition of done)
Ton puzzle est pret si:
1. Il est integre au flow CTF.
2. L'ordre des validations est strict.
3. Le quiz 3/5 fonctionne sans doublon.
4. Le feedback est clair.
5. Les contournements evidents sont bloques.
6. Le flag reste inaccessible tant que puzzle non valide.

---

## Methode de travail conseilee
1. Fais d'abord un schema papier du flow.
2. Implante ensuite seulement les verifications d'acces.
3. Puis implemente puzzle et quiz.
4. Termine par les tests de bypass.

Fais simple au debut. Un flow clair vaut mieux qu'un puzzle complique mais fragile.
