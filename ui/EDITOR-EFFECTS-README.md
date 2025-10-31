# 🎨 Editor Visual Effects - Guide

## Nouvelles Fonctionnalités

### 1. **Fond Audio-Réactif** 🎵
Le fond de l'éditeur de code change de couleur en fonction du volume audio en temps réel.

**Comment l'utiliser :**
- Cliquez sur le bouton **🎨 BG FX** dans l'en-tête
- Le fond commence à réagir à la musique quand vous cliquez sur START
- Le bouton devient **🎨 BG FX ON** quand actif
- Re-cliquez pour désactiver et revenir au fond par défaut

**Personnalisation dans le code :**
```javascript
// Changer la couleur de base (dans la console)
window.app.editorEffects.setBaseHue(280); // Violet
window.app.editorEffects.setBaseHue(120); // Vert
window.app.editorEffects.setBaseHue(0);   // Rouge
window.app.editorEffects.setBaseHue(200); // Bleu (défaut)
```

### 2. **Surlignage des Lignes Actives** ✨
Les lignes de code que vous exécutez (Ctrl+Enter) sont surlignées avec un effet lumineux **coloré selon le slot** et **persistent jusqu'à la prochaine exécution**.

**Comment ça marche :**
- Placez votre curseur sur une ligne
- Appuyez sur **Ctrl+Enter** pour l'exécuter
- La ligne s'illumine avec la couleur du slot (d1=vert, d2=cyan, d3=rose, etc.)
- Une bordure colorée apparaît à gauche de la ligne
- L'effet persiste tant que vous n'exécutez pas une nouvelle ligne

**Couleurs par Slot :**

- **d1** → Vert `#00ff88`
- **d2** → Cyan `#00d4ff`
- **d3** → Rose `#ff0088`
- **d4** → Orange `#ffaa00`
- **d5** → Violet `#aa00ff`
- **d6** → Orange foncé `#ff8800`
- **d7** → Lime `#88ff00`
- **d8** → Rouge `#ff0044`

**Exemple :**
```javascript
d1(s("bd*4"))  // Appuyez Ctrl+Enter → ligne surlignée en VERT ! Persiste jusqu'à la prochaine exécution
d2(s("hh*8"))  // Appuyez Ctrl+Enter → ligne surlignée en CYAN ! L'ancienne surbrillance d1 disparaît
```

### 3. **Animation Fluide** 🌊
- Le fond change de couleur en douceur (pas de clignotement)
- Transition fluide de 0.1s pour un effet visuel agréable
- Le volume audio est lissé pour éviter les changements brusques

## Fichiers Modifiés

### Nouveaux Fichiers
- `ui/editor-effects.js` - Module de gestion des effets visuels

### Fichiers Modifiés
- `app.js` - Intégration des effets (démarrage/arrêt, surlignage)
- `index.html` - Ajout du bouton 🎨 BG FX et du script
- `style.css` - Styles pour le surlignage des lignes et le bouton

## Architecture

```
EditorEffects
├── Audio-Reactive Background
│   ├── Analyse du volume (RMS)
│   ├── Lissage du volume (moyenne mobile)
│   ├── Mapping volume → couleur HSL
│   └── Application au fond de CodeMirror
│
└── Active Line Highlighting
    ├── Tracking des lignes exécutées (Map)
    ├── Application de classes CSS
    ├── Couleurs dynamiques par slot
    └── Surlignage persistent jusqu'à nouvelle exécution
```

## Conseils d'Utilisation

### Pour un Live Coding Visuel Impressionnant :
1. **Activez le fond audio-réactif** (🎨 BG FX)
2. **Ouvrez le popup psychédélique** (bouton "Open Popup")
3. **Exécutez vos patterns** avec Ctrl+Enter
4. **Regardez** le code s'illuminer en sync avec la musique ! 🎉

### Performance
- Les effets sont optimisés avec `requestAnimationFrame`
- Le volume est lissé pour réduire les calculs
- Pas d'impact sur la latence audio

## Désactivation

Si les effets ralentissent votre machine :
```javascript
// Dans la console du navigateur
window.app.editorEffects.stop();
```

Pour les réactiver :
```javascript
window.app.editorEffects.start();
```

---

**Enjoy the visual feedback! 🎨🎵✨**
