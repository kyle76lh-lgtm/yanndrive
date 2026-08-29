# YannDrive V0

Tableau de bord GPS statique conçu pour le navigateur intégré d'une Tesla.

## Fonctions

- vitesse GPS, vitesse maximale du trajet et repli sur un calcul entre deux positions ;
- distance, durée, vitesse moyenne et accélération estimée ;
- commandes Démarrer, Arrêter et Réinitialiser ;
- état et précision du GPS ;
- mode démo pour tester l'interface sans déplacement ;
- mode 67 activable : une célébration plein écran de trois secondes avec feu d'artifice doux se déclenche au franchissement de 67 km/h, sans flash rapide ;
- onglet Infos avec les cours Safran, Tesla, SpaceX (`SPCX`), Nvidia et Palantir, ainsi qu'une estimation de la prochaine pleine mer au Havre ;
- onglet Moteur avec six boucles WAV CC0 mélangées selon le régime, synthèse de secours et boîte automatique à six rapports ;
- mise en page responsive, tactile et sombre ;
- mode plein écran lorsque le navigateur l'autorise.

## Lancement local

La géolocalisation fonctionne sur `localhost` ou sur un site HTTPS. Depuis ce dossier :

```powershell
python -m http.server 8080
```

Puis ouvrir `http://localhost:8080`.

## Déploiement

Le dossier ne contient aucune dépendance et peut être déployé tel quel sur GitHub Pages, Cloudflare Pages, Netlify ou Vercel. Le site public doit impérativement être servi en HTTPS pour permettre l'accès au GPS.

## Test dans la Tesla

1. Déployer le dossier sur une URL HTTPS.
2. Ouvrir l'URL dans le navigateur Tesla à l'arrêt.
3. Autoriser la géolocalisation.
4. Vérifier la précision, la fréquence d'actualisation, `coords.speed` et la persistance de la page pendant un trajet.

La vitesse et l'accélération sont des estimations GPS et ne doivent pas être utilisées comme instruments de sécurité ou de conduite.

Les cours sont récupérés côté GitHub par une tâche planifiée, enregistrés dans `data/markets.json`, puis lus depuis le même domaine que l'application. Cette architecture évite les blocages CORS du navigateur Tesla. La marée est estimée depuis le niveau marin modélisé par Open-Meteo : elle est indicative et ne remplace jamais les horaires officiels du SHOM pour la navigation.
