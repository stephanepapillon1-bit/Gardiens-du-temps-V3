# Ressources illustrées de la refonte

Images nouvelles créées avec l’outil intégré de génération d’images. Les images de référence du héros viennent du dépôt initial. La génération produit des assets effectivement chargés dans Phaser, pas des maquettes de jeu.

- `ur-sunset.png` : paysage d’Ur au couchant récupéré du travail précédent. Le jeu référence des rectangles de l’image pour le fond, le sol, les plateformes et les canaux.
- `guardian-sheet.png` : six poses, grille 3 × 2, cellules 512 × 512. Golem fantastique de terre et d’eau turquoise, profil gauche; attente, préparation, frappe au sol, invocation, cœur exposé et épuisement. Une seconde passe retire le fond en conservant les poses.
- `irrigation-atlas.png` : grille 3 × 2; palmier, roseaux/orge, prise d’eau en bois et terre, tablette sur socle, digue avec paniers, évacuation. Palette ocre, olive et turquoise; exclure roues hydrauliques, colonnes grecques et portes bleues.
- `boar-sheet.png` : six phases de course d’un sanglier de profil gauche; cellules 512 × 512, même gabarit et niveau des pieds; brun et ocre, contours nets.

Contraintes communes des prompts : pixel art HD inspiré des jeux d’action SNES, objets entiers par cellule, fond transparent, aucune étiquette ni grille visible, échelle et palette cohérentes. Les fichiers PNG conservent leur alpha; leurs frames sont découpées par Phaser sans transformation destructive du fichier source.
