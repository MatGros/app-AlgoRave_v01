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
d1(s("bd0 bd1 bd2 bd1"))

// Custom samples
d2(s("bass bass ~ bass"))

// Fallback to synthesized drums if sample not found
d3(s("bd*4"))  // Will use synth if no bd.wav/bd0.wav found
```

## Example Files

If you don't have your own samples yet:
1. Download free sample packs from [freesound.org](https://freesound.org)
2. Or use online resources like [99sounds](https://99sounds.org/drum-samples/)
3. Place them in the appropriate folders with the naming convention

## Auto-Loading

The system will automatically:
1. Scan all folders on startup
2. Load all audio files found
3. Make them available with their names
4. Keep synthesized drums as fallback

**Note**: Large sample libraries may take a few seconds to load!
