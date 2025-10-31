# ALGO SIGNAL SOUND - Live Coding Music for Fun and Learning

A web-based live coding environment for making electronic music in real-time using code patterns and transformations.

## Features

- **Pattern Slots** - Independent d1, d2, d3... slots for organizing patterns
- **Mini-notation Parser** - Concise pattern language
- **Live Coding** - Evaluate code line-by-line with Ctrl+Enter
- **Pattern Transformations** - fast(), slow(), rev(), every(), etc.
- **Audio Synthesis** - Tone.js-powered synths and drums
- **Real-time Visualization** - Timeline and oscilloscope
- **Effects** - Reverb, delay, filters, panning
- **No Installation Required** - Runs entirely in the browser

## Quick Start

1. Open [index.html](index.html) in a modern web browser
2. **Important**: Click START button first (to initialize audio context)
3. Use **slots** (d1, d2, d3...) to control patterns
4. Press Ctrl+Enter on any line to evaluate

**Note:** The first time you click START, the browser needs to initialize the audio context (user interaction required).

## Pattern Slots (Important!)

You use **slots** to control your patterns independently. This prevents patterns from stacking up and keeps your mix organized!

```javascript
// Slot 1: Drums
d1(s("bd sd hh sd"))

// Slot 2: Melody
d2(note("c3 e3 g3 bb3").s("fm"))

// Update slot 1 (replaces previous!)
d1(s("bd*4"))

// Silence a specific slot
d2(silence())

// Stop ALL patterns
hush()
```

### Available Slots
- `d1` through `d9` - 9 independent pattern slots
- Each slot can hold ONE pattern
- Re-evaluating a slot REPLACES the previous pattern

## Mini-Notation Syntax

### Basic Patterns

```javascript
// s() automatically detects samples or notes!
d1(s("bd sd hh sd"))              // Detects as samples (drums)
d2(s("c3 e3 g3 bb3"))             // Detects as notes (melody)

// You can also use note() as alias:
d2(note("c3 e3 g3 bb3"))          // Same as s("c3 e3 g3 bb3")
```

### Repetition

```javascript
d1(s("bd*4"))                     // bd repeated 4 times
d2(s("hh*8"))                     // hh repeated 8 times
d3(s("c3*4"))                     // Note repeated 4 times
```

### Rests/Silence

Vous pouvez maintenant charger vos propres samples dans `samples/`.

Le moteur scanne automatiquement les dossiers au démarrage. Voici la
configuration actuelle (dossier → fichiers) :

```
samples/
  ├─ kick db/       - kick1.wav .. kick5.wav
  ├─ snares sd/     - sd1.wav .. sd3.wav
  ├─ hats hh/       - hh1.wav, hh2.wav, hat3.wav
  ├─ clap cp/       - cp1.wav .. cp3.wav
  ├─ perc/          - perc1.wav .. perc3.wav
  ├─ fx/            - fx1.wav .. fx3.wav
  ├─ bass/          - bass1.wav .. bass5.wav
  └─ custom/        - (vide)
```

Conseils rapides :
- Utilisez des noms courts et indexés pour les percussions : `bd1.wav`, `sd1.wav`,
  `hh1.wav`, `cp1.wav`, etc.
- Si vous conservez des noms originaux (comme `kick1.wav`), vous pouvez créer
  des alias (`bd1.wav`) ou laisser `kick1.wav` intact — le moteur charge tous
  les fichiers présents.

Exemples d'utilisation :

```javascript
// Voir les samples chargés dans la console
samples()

// Utilise bd1.wav si présent
d1(s("bd1*4"))

// Alternance entre plusieurs kicks
d1(s("kick1 kick2 kick3"))

// Custom samples du dossier /custom
d2(s("bass bass ~ bass"))
```

Si un sample manque pour un raccourci (ex. `bd` ou `cp`), le pattern peut être
silencieux en mode "sample-first". Pour forcer un synth, préfixez par
`synth:` (ex. `synth:clap`).

Voir `samples/README.md` pour des instructions plus détaillées.
d8(s("bd sd").gain(0.7).room(0.4).delay(0.2))
```

### 🎚️ Master Effects (Global - NEW!)

Master effects apply to **ALL audio** (all slots at once). Perfect for live transitions!

```javascript
// Low-pass filter (atténue les aigus)
masterLPF(800)    // Filtre à 800Hz (son plus sombre)
masterLPF(20000)  // Transparent (20kHz) - default

// High-pass filter (coupe les basses/kicks)
masterHPF(100)    // Coupe un peu les basses
masterHPF(200)    // Coupe beaucoup (plus de kick!)
masterHPF(20)     // Transparent (20Hz) - default

// Reverb globale
masterReverb(0.5) // 50% de reverb
masterReverb(0)   // Son sec (dry) - default

// Delay global
masterDelay(0.3)  // 30% de delay
masterDelay(0)    // Pas de delay - default

// Volume master
masterVolume(0.8) // 80% - default
masterVolume(1.0) // 100% (full power!)

// Compressor (contrôle la dynamique)
masterCompressor(-20, 4)  // Threshold: -20dB, Ratio: 4:1 - default
masterCompressor(-15, 6)  // Plus de compression

// Reset tous les effets master
masterReset()
```

#### Master Effects Examples

```javascript
// Psytrance filter sweep (transition classique)
d1(s("bd*4"))
d2(note("c1 c1 d1 eb1").s("fm"))
d3(s("hh*16"))
// ... puis sweep:
masterLPF(800)   // Atténue les aigus
masterLPF(500)   // Plus sombre
masterLPF(300)   // Très sombre
masterLPF(20000) // Drop! Retour normal

// Breakdown atmosphérique
masterReverb(0.6)  // Beaucoup de reverb
masterDelay(0.4)   // Delay spacieux
masterHPF(150)     // Coupe les basses
// ... puis reset pour le drop:
masterReset()      // Retour au son sec et puissant!

// Build-up avec volume
masterVolume(0.3)  // Commence faible
masterVolume(0.5)  // Monte progressivement
masterVolume(0.7)  // Monte encore
masterVolume(1.0)  // Drop à full power!
```

**Interface UI** : Utilisez les sliders dans le panneau "Master Effects" pour contrôler en temps réel!

## Synthesizers

```javascript
// Set synth type with .s()
d1(note("c3 e3 g3").s("sawtooth"))
d2(note("c2 eb2 g2").s("square"))
d3(note("c4 e4 g4").s("sine"))
d4(note("c3 eb3 g3").s("fm"))          // FM synthesis (psychedelic!)
d5(note("c4 e4 g4").s("am"))           // AM synthesis
```

## Stacking Patterns

```javascript
// Stack multiple patterns in ONE slot
d1(stack(
  s("bd*4"),
  s("hh*8").pan(0.8),
  note("c2 eb2 g2").s("sawtooth").lpf(500),
  s("sd ~ sd ~").room(0.3)
))
```

## Control Functions

```javascript
hush()              // Stop all patterns
silence()           // Same as hush()
d1(silence())       // Silence slot 1 only
```

## Complete Examples

### Techno

```javascript
d1(s("bd*4"))
d2(s("hh*8").pan(0.7))
d3(s("~ ~ sd ~").room(0.4))
d4(note("c2 ~ eb2 ~").s("sawtooth").lpf(800))
```

### Psytrance

```javascript
d1(s("bd bd bd bd"))
d2(s("hh*16").pan(0.6))
d3(s("~ ~ ~ ~ sd ~ ~ ~"))
d4(note("c3 eb3 g3 bb3 c3 eb3 f3 bb3").s("fm").fast(2))
```

### Ambient

```javascript
d1(note("c3 eb3 g3 bb3").s("sine").slow(2).room(0.8))
d2(note("c2").s("sine").slow(4).room(0.9))
d3(s("~ ~ ~ ~ ~ ~ ~ cp").room(0.9).delay(0.5))
```

### Drum & Bass

```javascript
d1(s("bd ~ ~ ~ bd ~ bd ~"))
d2(s("~ ~ sd ~ ~ sd ~ ~").room(0.3))
d3(s("hh*16").pan(0.8))
d4(note("c2 ~ eb2 f2 ~ g2 ~ bb2").s("sawtooth").lpf(400).fast(2))
```

## Stopping Patterns

```javascript
// Stop all patterns
hush()

// Or use this alias
silence()

// Silence a specific slot
d1(silence())
d2(silence())
```

## Keyboard Shortcuts

- **Ctrl+Enter** (or Cmd+Enter) - Smart evaluation: evaluates selected lines if any, otherwise current line
- **Ctrl+.** - Stop selected lines/slots (stops all slots found in selected lines)
- **Ctrl+Space** - Autocomplete: shows all available commands

## 🎵 Custom Samples (NEW!)

You can now **load your own audio samples** into AlgoSignalSound!

### Quick Setup

1. Place your audio files in the `samples/` folder:

   ```text
   samples/
     ├── kicks/      - Kick drum samples (bd0.wav, bd1.wav, etc.)
     ├── snares/     - Snare drum samples (sd0.wav, sd1.wav, etc.)
     ├── hats/       - Hi-hat samples (hh0.wav, hh1.wav, etc.)
     ├── percs/      - Percussion samples (cp0.wav, oh0.wav, etc.)
     └── custom/     - Your custom samples (any name)
   ```

2. Use numbered naming for variations:

   - `bd0.wav`, `bd1.wav`, `bd2.wav` ... (up to bd9)
   - `sd0.wav`, `sd1.wav`, `sd2.wav` ... (up to sd9)
   - `hh0.wav`, `hh1.wav`, `hh2.wav` ... (up to hh9)

3. The system auto-loads samples on START

### Supported Formats

- WAV (recommended)
- MP3 (compressed)
- OGG (good quality/size)

### Using Custom Samples

```javascript
// Check what samples are loaded
samples()  // Shows info in console

// Use numbered variations
d1(s("bd0*4"))         // Uses bd0.wav if loaded
d2(s("bd1 bd2 bd0 bd1")) // Mix different kicks

// Numbered samples with patterns
d3(s("hh0*8 hh1*8"))   // Alternate between two hi-hat samples

// Custom samples from /custom folder
d4(s("bass bass ~ bass"))  // Uses bass.wav if loaded
```

### Fallback to Synth

If a sample file isn't found, AlgoSignalSound automatically falls back to synthesized drums. This means you can use the same pattern whether samples are loaded or not!

```javascript
// This works with or without samples:
d1(s("bd sd hh sd"))  // Uses samples if available, synth if not
```

**For more details, see `samples/README.md`**

---

## Sound Library

### Drums (use with `s()`)
- `bd` / `kick` - Bass drum
- `sd` / `snare` - Snare drum
- `hh` / `hihat` - Closed hi-hat
- `oh` / `openhh` - Open hi-hat
- `cp` / `clap` - Handclap

### Synths (use with `note().s()`)
- `sine` - Pure sine wave
- `square` - Square wave
- `sawtooth` - Sawtooth wave
- `triangle` - Triangle wave
- `fm` - FM synthesis (psychedelic!)
- `am` - AM synthesis

## Notes Reference

```javascript
// Note format: note name + octave
note("c3")     // C in octave 3
note("eb4")    // E-flat in octave 4
note("f#5")    // F-sharp in octave 5

// Notes cycle through patterns
d1(note("c3 e3 g3 c4"))  // C major arpeggio
```

## Architecture

```
/core/
  - parser.js       // Mini-notation parser
  - pattern.js      // Pattern class with transformations

/audio/
  - master.js       // Master effects bus (NEW!)
  - synths.js       // Tone.js synthesizers
  - samples.js      // Sample management
  - effects.js      // Audio effects (per-pattern)
  - scheduler.js    // Pattern scheduler

/editor/
  - evaluator.js    // Code evaluation engine with slots

/ui/
  - visualizer.js   // Timeline & scope visualization
```

### Audio Signal Flow

```text
Pattern Slots (d1-d9)
    ↓
Synths/Samples → Pattern Effects (gain, lpf, hpf, reverb, delay, pan)
    ↓
Master Bus → HPF → LPF → Compressor → Reverb → Delay → Gain → Limiter
    ↓
Speakers 🔊
```

## Audio Optimization

### Latency Settings

The app includes **3 latency modes** to optimize audio performance based on your system:

1. **Low (Interactive)** - Minimal latency but may cause crackling on slower systems
2. **Medium (Balanced)** - Good balance between latency and stability
3. **High (Playback)** ★ **RECOMMENDED** - Maximum stability, slight latency increase

**How to change:**
1. Look for "Audio Settings" panel on the right
2. Select your preferred latency mode
3. Click STOP then START to apply

### Audio Engine Configuration

The app automatically optimizes several parameters:
- **Latency Hint**: Configurable (interactive/balanced/playback)
- **Transport lookAhead**: 0.2 seconds (schedules events ahead of time)
- **Transport updateInterval**: 0.05 seconds (timing precision)
- **Synth Polyphony**: Limited to 16 voices per synth to prevent memory saturation
- **Node Cleanup**: Automatic disposal of audio nodes after playback

These settings prevent the audio crackling/glitching issues that can occur during long sessions with many simultaneous patterns.

## Technologies

- **[Tone.js v14](https://tonejs.github.io/)** - Web Audio framework
- **[CodeMirror 5](https://codemirror.net/)** - Code editor
- **Web Audio API** - Audio synthesis
- **Canvas API** - Visualizations

## Philosophy

Inspired by the live coding music movement, this tool enables musicians to create and manipulate electronic music in real-time through code, making the creative process transparent and improvisational.

## Browser Support

Works best in:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

Requires a modern browser with Web Audio API support.

## Tips for Live Coding

1. **Use slots** - d1, d2, d3 keep things organized
2. **Start simple** - Begin with one drum pattern in d1
3. **Build incrementally** - Add patterns one slot at a time
4. **Update live** - Re-evaluate any slot to change it instantly
5. **Experiment!** - Try random combinations and see what happens

## Examples to Try

Copy and paste these into the editor, then press Ctrl+Enter on each line:

```javascript
// Basic beat
d1(s("bd sd hh sd"))

// Speed it up
d1(s("bd sd hh sd").fast(2))

// Add a bassline
d2(note("c2 eb2 g2 bb2").s("sawtooth").lpf(600))

// Add effects
d3(s("cp ~ ~ ~").room(0.9).delay(0.5))

// Stack everything in one slot
d4(stack(
  s("bd*4"),
  s("hh*8"),
  note("c3 eb3 g3 bb3").s("fm").fast(2),
  s("~ ~ sd ~").room(0.4)
))

// Stop everything
hush()
```

## License

Free and open for creative use. Make music!

---

**Happy live coding!** 🎵💻✨
