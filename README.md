# THIS.VOCODER

A browser-based vocoder and carrier synthesis engine built entirely in vanilla HTML/JS — no dependencies, no install, just open the file.

> **Note:** The UI layout and this README were generated with AI assistance. The DSP engine and core audio logic were written by the author (D3/DX).

---

## What It Does

THIS.VOCODER takes two audio signals — a **modulator** (typically voice or speech) and a **carrier** (a synthesizer or audio file) — and imprints the spectral shape of the modulator onto the carrier. The result is the classic "robot voice" or talking synthesizer effect, but with a full rack of controls to push it far beyond that.

Everything runs in real-time in your browser using the Web Audio API's ScriptProcessor. No audio ever leaves your machine.

---

## Getting Started

1. Open `voxmdc.html` in a browser (Chrome or Firefox recommended)
2. Click or drag an audio file into **Input 1 — Modulator** (your voice, speech, or any audio)
3. Optionally load a second audio file into **Input 2 — Carrier**, or leave it on the built-in oscillator
4. Select notes on the keyboard (or leave the defaults)
5. Hit **PLAY**

---

## Modules

### Audio I/O
The top routing panel. Load audio files into the two input slots via click or drag-and-drop.

- **Input 1 (Modulator)** — the signal whose spectral envelope is analysed. Usually voice.
- **Input 2 (Carrier)** — optional audio file to use as the carrier instead of the oscillator.
- **Carrier Source** — switch between the built-in OSC and a loaded file for Input 2.
- **Stereo** — enables true stereo processing with independent L/R vocoder states and a variable width control.
- **Out Vol** — master output gain.
- **Save WAV** — offline render to a stereo WAV file. Enter a duration in seconds, or `L` to match the length of Input 1.
- **Save / Load Config** — export and restore all settings as a JSON file. Optionally embed the loaded audio into the config so the whole session is self-contained in one file.

---

### Vocoder
The core DSP module. Analyses the modulator through a bank of bandpass filters and uses the resulting envelopes to amplitude-modulate matching bands on the carrier.

| Parameter | Description |
|---|---|
| Bands | Number of filter bands (4–256). More bands = more detail, more CPU. |
| Q Factor | Filter sharpness. Higher Q = narrower, more resonant bands. |
| Pitch Shift | Shifts the modulator's analysis bands up or down in semitones before applying to the carrier. Useful for pitch correction or creative effects. |
| Attack | Envelope follower attack time — how fast the bands react to transients. |
| Release | Envelope follower release time — how long bands hold after the signal drops. |
| Wet | Dry/wet blend between the processed vocoder signal and the raw carrier. |
| Output Gain | Post-vocoder gain. The vocoder output is typically quiet; use this to compensate. |
| Filter Iter | Number of cascaded filter passes per band. Higher = steeper roll-off, more CPU. |

---

### Multiband Compressor
A 3-band dynamic processor applied after the vocoder. Splits the signal into low, mid, and high bands and compresses each independently.

| Parameter | Description |
|---|---|
| Ratio | Compression ratio across all bands. |
| Attack / Decay | Compressor timing. Very short decay settings produce pumping; longer settings are more transparent. |
| Filter Iter / Q | Controls the crossover filter steepness and shape. |
| Freq Low / Mid-L / Mid-H / High | Crossover frequencies defining the three bands. |
| Thr Low / Mid / High | Per-band threshold. Lower values compress more aggressively. |

---

### Oscillator
The carrier signal generator used when no file is loaded into Input 2. A polyphonic wavetable oscillator with super-voice unison, a filter, FX chain, and LFO.

**Waveforms:** Sine, Sawtooth, Square, Triangle

**Core**
| Parameter | Description |
|---|---|
| Gain | Oscillator output level going into the vocoder. |
| Super Voices | Number of detuned unison voices per note. Creates width and thickness. |
| Detune | Spread of the super voices in semitones. |

**Filter** — applied to the carrier before vocodering.
| Parameter | Description |
|---|---|
| Type | Lowpass, Highpass, Bandpass, Notch, or Off. |
| Cutoff | Filter cutoff frequency. |
| Resonance | Filter Q / resonance amount. |
| Poles | Cascaded filter stages (1–4). More poles = steeper roll-off. |
| Pitch Track | Scales the cutoff frequency with the played note frequency. At 1× the cutoff tracks 1:1 with pitch. |
| Per-Voice Filter | Applies the filter independently to each super-voice for richer modulation. |

**FX Chain** — distortion → chorus → delay, in series.
| Parameter | Description |
|---|---|
| Distortion | Soft-clip waveshaping amount. |
| Delay MS | Delay time in milliseconds. |
| Delay FB | Delay feedback (0–0.99). |
| Delay Mix | Dry/wet blend for the delay. |
| Chorus Voices | Number of chorus voices (0 = off). |
| Chorus Depth | LFO depth applied to chorus delay time. |
| Chorus FB | Chorus feedback. |
| Chorus Rate | LFO rate for the chorus modulation. |
| Chorus Size | Delay buffer size in samples for the chorus. |

**LFO** — modulates filter cutoff, gain, or pitch.
| Parameter | Description |
|---|---|
| Target | What the LFO modulates: Filter, Gain, or Pitch. |
| Shape | Sine, Square, Sawtooth, or Triangle. |
| Rate | LFO frequency in Hz. |
| Depth | LFO modulation depth. |

---

### Synth Keyboard
A click/touch MIDI-style keyboard for selecting the oscillator's notes. Supports polyphonic input — click multiple keys to build chords.

Chord presets (Major, Minor, Dim, Aug, 7th, Maj7, Min7, Octave, SuperMaj, SuperMin) apply relative to the selected root note and octave. Clear resets all active notes.

---

### Spectral Display
A real-time visualizer at the top of the rack. When playing, it shows the vocoder's per-band envelope state — giving a rough view of where energy is distributed across the frequency spectrum. Peaks hold briefly before decaying.

---

## Signal Flow

```
Input 1 (Modulator)
        │
        ▼
  Vocoder Analysis ──── band envelopes ────▶ Vocoder Synthesis ──▶ MBC ──▶ Out
                                                     ▲
Input 2 / OSC ──── Filter ──── FX Chain ────────────┘
```

In stereo mode, L and R paths are processed independently with a configurable shift offset between them for width.

---

## Tips

- **Intelligibility:** Increase Bands (32–64) and tighten Q (0.9+) for clearer speech reproduction. Shorter Attack also helps consonants cut through.
- **Thick pads:** Use Sawtooth or Square wave, 8+ super voices, moderate detune. Add Chorus for extra width.
- **Robotic effect:** Square wave carrier, low band count (8–16), slow release.
- **Pitch shift:** Use the vocoder's Pitch Shift to transpose the perceived pitch of the modulator without pitch-shifting the carrier.
- **Config embeds:** Check the "Embed Audio" boxes before saving config to create a shareable single-file session.
- **CPU:** Bands, Filter Iter (vocoder and MBC), and super voice count are the main CPU drivers. Reduce if you get stuttering.

---

## Browser Compatibility

Works in any modern browser with Web Audio API support. Chrome and Firefox are recommended. Safari may have issues with `ScriptProcessor` on some versions.

No internet connection required after the file is loaded. All audio processing is local.
