# LHdrive V0

Tableau de bord GPS statique conçu pour le navigateur intégré d'une Tesla.

## Fonctions

- vitesse GPS et vitesse maximale du trajet, avec repli sur un calcul entre deux positions ;
- durée et vitesse moyenne ;
- commandes Démarrer, Arrêter et Réinitialiser ;
- coût estimé du trajet dans Conduite : distance GPS × consommation moyenne réglable (18 kWh/100 km par défaut) × tarif électrique réglable (0,134 €/kWh par défaut) ; les deux réglages sont mémorisés, Arrêter conserve le total et Démarrer le reprend, Réinitialiser le remet à zéro ; estimation hors pertes de recharge, sans lecture de la consommation réelle de la Tesla ;
- état et précision du GPS ;
- mode démo pour tester l'interface sans déplacement ;
- mode 67 activable : une célébration plein écran de trois secondes avec feu d'artifice doux se déclenche au franchissement de 67 km/h, sans flash rapide ;
- onglet Infos, intitulé Marchés, avec les cours Safran, Tesla, SpaceX (`SPCX`), Nvidia et Palantir ;
- onglet Marées dédié au Havre : prochaine pleine et basse mer, hauteurs, coefficients renseignés, tableau d'aujourd'hui et demain en heure de Paris (été/hiver), à partir de la table 2026 ; les périodes non couvertes sont signalées ;
- vitesse maximale du trajet affichée en haut à la place de l'heure ; menus Mascotte, Moteur et Galaxie retirés de l'application ;
- réglage persistant des accélérations en `m/s²` ou en `g` ;
- onglet Ponts pour Pont Rouge, Pont 7, Pont 7 bis, Pont 8 et les ponts Quinette amont/aval, normalisé depuis l’API HAROPA avec repli sur le flux Waze et détection des données anciennes ;
- mise en page responsive, tactile et sombre ;
- mode plein écran lorsque le navigateur l'autorise.

## Lancement local

La distance utilise l'intégration de deux vitesses GPS successives lorsque celles-ci sont disponibles, même si les coordonnées restent figées. Sinon, les déplacements entre coordonnées sont cumulés. Une seule source est comptée par intervalle ; les pauses et pertes de signal réinitialisent les références. L'accélération GPS et ses records sont estimés à partir des variations de vitesse ; une mesure manquante ou trop ancienne est affichée « — ». Ces estimations restent dépendantes de la fréquence et de la qualité du GPS du navigateur.

Vérification des calculs et des régressions GPS : `node scripts/test-trip.cjs`.

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

Les cours sont récupérés côté GitHub par une tâche planifiée, enregistrés dans `data/markets.json`, puis lus depuis le même domaine que l'application. Cette architecture évite les blocages CORS du navigateur Tesla. La prochaine pleine mer est lue dans `data/tides-le-havre-2026.csv`, table dédiée au port du Havre contenant les heures locales, hauteurs et coefficients. Ces données restent indicatives et ne remplacent jamais les publications officielles du SHOM pour la navigation.

L’état des ponts est récupéré en temps réel par le Worker Cloudflare contenu dans `worker/`, avec un cache de 25 secondes et cinq minutes de secours. L’API `/map/getPonts` est prioritaire et `/waze/incidents` sert de solution de repli. Le frontend interroge le Worker toutes les 25 secondes et utilise `data/bridges.json`, produit par GitHub Actions, si le Worker est indisponible. Les statuts trop anciens sont neutralisés.
