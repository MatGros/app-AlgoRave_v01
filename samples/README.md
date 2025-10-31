# Custom Samples

Place your custom audio samples here!

## Folder Structure

```
samples/
  ├── kicks/      - Kick drum samples (bd0.wav, bd1.wav, etc.)
  ├── snares/     - Snare drum samples (sd0.wav, sd1.wav, etc.)
  ├── hats/       - Hi-hat samples (hh0.wav, hh1.wav, etc.)
  ├── percs/      - Percussion samples (cp0.wav, oh0.wav, etc.)
  └── custom/     - Your custom samples (any name)
```

## Naming Convention

### Drums (numbered for variations)
- Kicks: `bd0.wav`, `bd1.wav`, `bd2.wav` ... or `kick0.wav`, `kick1.wav`...
- Snares: `sd0.wav`, `sd1.wav`, `sd2.wav` ... or `snare0.wav`, `snare1.wav`...
- Hi-hats: `hh0.wav`, `hh1.wav`, `hh2.wav` ... or `hihat0.wav`, `hihat1.wav`...
- Claps: `cp0.wav`, `cp1.wav` ... or `clap0.wav`, `clap1.wav`...
- Open HH: `oh0.wav`, `oh1.wav` ... or `openhh0.wav`, `openhh1.wav`...

### Custom Samples
In `custom/` folder, use any name you want:
- `bass.wav`, `lead.wav`, `vocal.wav`, etc.

## Supported Formats
- WAV (recommended for best quality)
- MP3 (compressed, smaller files)
- OGG (good quality/size balance)

## Usage in Code

```javascript
// Use numbered drum samples (if bd1.wav exists)
d1(s("bd1*4"))

// Mix different variations
```markdown
# Samples / Assets

Ce dossier contient les samples utilisés par AlgoSignalSound. Le moteur scanne
automatiquement tous les sous-dossiers de `samples/` au démarrage et charge
tous les fichiers audio valides.

## Structure actuelle

Voici l'état actuel du dossier `samples/` (analyse automatique) :

```
samples/
  ├─ kick db/       - kick1.wav .. kick5.wav
  ├─ snares sd/     - sd1.wav .. sd3.wav
  ├─ hats hh/       - hh1.wav, hh2.wav, hat3.wav
  ├─ clap cp/       - cp1.wav .. cp3.wav
  ├─ perc/          - perc1.wav .. perc3.wav
  ├─ fx/            - fx1.wav .. fx3.wav
  ├─ bass/          - bass1.wav .. bass5.wav
  └─ custom/        - (vide) — placez vos samples ici
```

> Remarque : certains dossiers utilisent déjà des alias dans leur nom
> (par ex. `snares sd`, `hats hh`, `clap cp`) — c'est intentionnel pour
> faciliter la correspondance entre les raccourcis dans le code (`sd`, `hh`,
> `cp`) et les fichiers présents.

## Convention recommandée

- Drums / percussions : utilisez des noms courts et indexés `bd1.wav`, `sd1.wav`,
  `hh1.wav`, `cp1.wav`, `oh1.wav`, `perc1.wav`, etc. (lowercase, sans espaces)
- Variantes : incrémentez le suffixe numérique pour plusieurs variations
  (ex. `bd1.wav`, `bd2.wav`, ...)
- Custom : tout nom est accepté dans `samples/custom/` (par ex. `bass.wav`)

Le moteur supporte WAV, MP3 et OGG — WAV est recommandé pour la meilleure qualité
et la latence minimale.

## Utilisation rapide

```javascript
// Utilise les fichiers chargés, si bd1.wav existe il sera utilisé
d1(s("bd1*4"))

// Alternance entre plusieurs kicks
d1(s("kick1 kick2 kick3"))  // si ces fichiers existent

// Custom samples depuis /custom
d2(s("bass bass ~ bass"))
```

## Bonnes pratiques

- Préférez créer des copies/alias si vous souhaitez garder les noms originaux
  (ex. `kick1.wav`) et ajouter `bd1.wav` comme alias. Cela évite de perdre
  l'organisation initiale.
- Si vous renommez des dossiers ou fichiers, relancez l'application (STOP →
  START) pour forcer un re-scan des samples.

## Que faire si un son est manquant ?

- Le mode "sample-first" est actif : si aucun fichier n'existe pour un token
  (ex. `cp`), l'événement peut être silencieux. Pour forcer un synthé, utilisez
  le préfixe `synth:` (ex. `synth:clap`).
- Pour diagnostiquer, ouvrez la console et appelez `samples()` dans la page pour
  voir la liste des fichiers chargés.

---

Besoin d'aide pour renommer ou créer des alias automatiquement ? Je peux
générer des copies alias (ex. `bd1.wav` → copie de `kick1.wav`) ou ajouter une
logique runtime dans `audio/samples.js` pour mapper plusieurs dossiers/alias.
```
