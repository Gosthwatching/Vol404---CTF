# Tuto Puzzle CTF sans code

## Objectif
Créer un mini jeu en 5 étapes avec:
- des images chiffrées (indices vrais ou faux)
- une clé cachée dans un média (image ou audio)
- un chemin final vers une page de validation
- un questionnaire de 3 questions tirées aléatoirement parmi 5
- un message de fin qui confirme l'arrêt du jeu

## Phase 1: Design du jeu
1. Définis les 5 étapes pédagogiques que tu veux évaluer.
2. Pour chaque étape, écris un indice principal.
3. Ajoute des faux indices pour créer le doute.
4. Choisis où cacher la clé finale: image, audio, ou les deux.
5. Décide le chemin final attendu et la règle de réussite.

## Phase 2: Matériel de puzzle
1. Prépare 7 à 10 visuels puzzle.
2. Attribue à chaque visuel:
- rôle: vrai indice ou faux indice
- difficulté: facile, moyen, difficile
- lien avec une étape
3. Prépare 1 média-clé (audio ou image).
4. Rédige une feuille de correction pour toi:
- ce que contient chaque indice
- comment l'indice se lit
- pourquoi il est vrai ou faux

## Phase 3: Logique de progression
1. Le joueur ouvre la page puzzle.
2. Il collecte des morceaux d'information.
3. Il reconstitue le chemin final.
4. Si le chemin est correct, il débloque le questionnaire.
5. Le questionnaire choisit 3 questions au hasard sur 5.
6. Si le seuil est atteint, le jeu affiche validation et fin.

## Phase 4: Questionnaire
1. Rédige 5 questions courtes, une par étape.
2. Pour chaque question:
- 4 choix maximum
- 1 bonne réponse
- un feedback clair
3. Prévois un seuil de validation simple:
- 2 sur 3 minimum, ou 3 sur 3 selon difficulté
4. Prépare deux feedbacks globaux:
- réussite
- à refaire

## Phase 5: UX
1. Écran 1: briefing du puzzle.
2. Écran 2: zone d'indices et collecte.
3. Écran 3: validation du chemin.
4. Écran 4: questionnaire.
5. Écran 5: résultat et confirmation d'arrêt.

## Règles de qualité
1. Chaque étape doit avoir un indice testable.
2. Les faux indices doivent être plausibles, pas absurdes.
3. Le média-clé doit être identifiable sans hasard pur.
4. La validation finale doit rester compréhensible.
5. Le feedback doit expliquer l'erreur, pas juste dire faux.

## Plan d'apprentissage pour toi
1. D'abord: conçois le jeu sur papier.
2. Ensuite: fais un prototype visuel statique.
3. Puis: ajoute la progression étape par étape.
4. Après: ajoute le tirage aléatoire des 3 questions.
5. Enfin: ajoute la fin de jeu et les messages de feedback.

## Checklist de lancement
- scénario des 5 étapes prêt
- banque de 7+ images prête
- clé cachée prête
- questionnaire 5 questions prêt
- critères de réussite définis
- flow complet testé de bout en bout
