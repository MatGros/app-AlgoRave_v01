# ALGORAVE - Live Coding Music

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
// Sound patterns (drums/samples) - use with d1(), d2(), etc.
d1(s("bd sd hh sd"))              // bass drum, snare, hi-hat, snare

// Note patterns (melodies)
d2(note("c3 e3 g3 bb3"))          // C minor 7th arpeggio
```

### Repetition

```javascript
d1(s("bd*4"))                     // bd repeated 4 times
d2(s("hh*8"))                     // hh repeated 8 times
```

### Rests/Silence

```javascript
d1(s("bd ~ sd ~"))                // ~ = rest/silence
```

### Alternation

```javascript
d1(s("<bd sd> hh"))               // Alternates: bd-hh, then sd-hh
```

## Pattern Transformations

```javascript
// Speed up x2
d1(s("bd sd").fast(2))

// Slow down x2
d2(s("bd sd").slow(2))

// Reverse
d3(s("bd sd hh cp").rev())

// Every N cycles
d4(s("bd sd").every(4, fast(2)))

// Probabilistic
d5(s("bd sd").sometimes(fast(2)))  // 50% chance
d6(s("bd sd").rarely(rev()))       // 25% chance
d7(s("bd sd").often(fast(2)))      // 75% chance
```

## Effects

```javascript
// Volume/Gain (0-1, default 0.5)
d1(s("bd sd").gain(0.8))           // Louder
d2(s("hh*8").gain(0.2))            // Quieter

// Reverb
d3(s("bd sd").room(0.5))

// Delay
d4(s("bd sd").delay(0.3))

// Low-pass filter
d5(note("c3 e3 g3").lpf(800))

// High-pass filter
d6(s("bd sd").hpf(100))

// Panning (0-1 or -1 to 1)
d7(s("hh*8").pan(0.8))

// Combine multiple effects
d8(s("bd sd").gain(0.7).room(0.4).delay(0.2))
```

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

- **Ctrl+Enter** (or Cmd+Enter) - Evaluate current line
- **Ctrl+Shift+Enter** - Evaluate all code
- **Ctrl+.** - Stop playback (stops transport and clears patterns)

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
  - synths.js       // Tone.js synthesizers
  - samples.js      // Sample management
  - effects.js      // Audio effects
  - scheduler.js    // Pattern scheduler

/editor/
  - evaluator.js    // Code evaluation engine with slots

/ui/
  - visualizer.js   // Timeline & scope visualization
```

## Technologies

- **[Tone.js](https://tonejs.github.io/)** - Web Audio framework
- **[CodeMirror](https://codemirror.net/)** - Code editor
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
