// grumblebum ish js code
// State for Left Channel
let L_lpf1 = 0, L_lpf2 = 0, L_lpf3 = 0, L_lpf4 = 0, L_hpf = 0;
let L_schmittState = -1, L_lastCrossTime = -1, L_period = 0, L_phase = 0, L_feed = 0;
let L2_hpf = 0

// State for Right Channel
let R_lpf1 = 0, R_lpf2 = 0, R_lpf3 = 0, R_lpf4 = 0, R_hpf = 0;
let R_schmittState = -1, R_lastCrossTime = -1, R_period = 0, R_phase = 0, R_feed = 0;
let R2_hpf = 0


// Shared Parameters
let lpfAlpha = 0.75;
let hpfAlpha = 0.001;
let mul = 0.5;
let hysteresis = 0.0;
let sp = 0.85; // Period smoothing
let fb = 0.; // Feedback amount
let hpfC=.5
let wetAmp = 1
let dryAmp = 1
let HPFL
let HPFR


return (t, sr, audio) => {
    // 1. Grab Stereo Input
	audio =	[
					[audioIN(t*sr%audioLength(0),0,0), audioIN(t*sr%audioLength(0),1,0)],
					[random()-.5, random()-.5],
				][0]
  let inL = audio[0] + L_feed * fb;
  let inR = audio[1] + R_feed * fb;

    // --- PROCESS LEFT CHANNEL ---
    L_hpf += hpfAlpha * (inL - L_hpf);
    L_lpf1 += lpfAlpha * (inL - L_hpf - L_lpf1);
    L_lpf2 += lpfAlpha * (L_lpf1 - L_lpf2);
    L_lpf3 += lpfAlpha * (L_lpf2 - L_lpf3);
    L_lpf4 += lpfAlpha * (L_lpf3 - L_lpf4);
    
    let L_crossed = false;
    if (L_schmittState <= 0 && L_lpf4 > hysteresis) {
        L_schmittState = 1; 
        L_crossed = true;
    } else if (L_schmittState >= 0 && L_lpf4 < -hysteresis) {
        L_schmittState = -1;
    }

    if (L_crossed) {
        if (L_lastCrossTime > 0) {
            let curP = t - L_lastCrossTime;
            if (curP > 0.000001 && curP < 1.0) {
                L_period = L_period === 0 ? curP : (L_period * sp + curP * (1 - sp));
            }
        }
        L_lastCrossTime = t;
    }

    // --- PROCESS RIGHT CHANNEL ---
    R_hpf += hpfAlpha * (inR - R_hpf);
    R_lpf1 += lpfAlpha * (inR - R_hpf - R_lpf1);
    R_lpf2 += lpfAlpha * (R_lpf1 - R_lpf2);
    R_lpf3 += lpfAlpha * (R_lpf2 - R_lpf3);
    R_lpf4 += lpfAlpha * (R_lpf3 - R_lpf4);

    let R_crossed = false;
    if (R_schmittState <= 0 && R_lpf4 > hysteresis) {
        R_schmittState = 1;
        R_crossed = true;
    } else if (R_schmittState >= 0 && R_lpf4 < -hysteresis) {
        R_schmittState = -1;
    }

    if (R_crossed) {
        if (R_lastCrossTime > 0) {
            let curP = t - R_lastCrossTime;
            if (curP > 0.000001 && curP < 1.0) {
                R_period = R_period === 0 ? curP : (R_period * sp + curP * (1 - sp));
            }
        }
        R_lastCrossTime = t;
    }

    // --- SYNTHESIS ENGINE ---
    const TWO_PI = Math.PI * 2;
    let outL = 0, outR = 0;

    // Left Synth
    if (L_period > 0) {
        L_phase += (1.0 / L_period) / sr * mul;
        if (L_phase > 1.0) L_phase -= 1.0;
        outL = renderSynth(L_phase, t);
    }

    // Right Synth
    if (R_period > 0) {
        R_phase += (1.0 / R_period) / sr * mul;
        if (R_phase > 1.0) R_phase -= 1.0;
        outR = renderSynth(R_phase, t);
    }

    L_feed = outL;
    R_feed = outR;
	audio[0]*=wetAmp
	audio[1]*=wetAmp
	L2_hpf+=(audio[0]-L2_hpf)*hpfC
	HPFL=(audio[0]-L2_hpf)*hpfC

	R2_hpf+=audio[0]-R2_hpf
	HPFR=audio[0]-L2_hpf

    return [outL * dryAmp + HPFL, outR * dryAmp + HPFR];
};

function renderSynth(phase, t) {
    let s = 0
    s += Math.sin(phase * 6.283185307179586) * 0.5;    // sine
    // s -= (phase - 0.5) * 2;                            // Saw
    // s += (phase > 0.5 ? 1 : -1) * 0.5;                 // Square
    
    // // PWM 1
    // let pwm1 = t % 1;
    // s += (phase > pwm1 ? 1 : -1) * 0.5 + pwm1 - 0.5;
    
    // // PWM 2
    // let pwm2 = (t * 0.5) % 1;
    // s += (phase > pwm2 ? 1 : -1) * 0.5 + pwm2 - 0.5;
    
    return s;
}
//ends here

//idk what this thing is
let phaseL = 0, phaseR = 0;
let lastSampleL = 0, lastSampleR = 0;
let flipL = 1, flipR = 1;
let feedL = 0, feedR = 0;

let limit = 1;
let speed = 1/2**5;
let linDecay = limit*speed;
let noDcIfSilenceHard = 0;
let noDcIfSilence = 1;
let flipEveryFrame = 1;
let fb = .05;
let vol = .25;

return (t, sr, audio) => {
	audio =	[
					[audioIN(t*sr%audioLength(0),0,0), audioIN(t*sr%audioLength(0),1,0)],
					[random()-.5, random()-.5],
				][0]
  let inL = audio[0] + feedL * fb;
  let inR = audio[1] + feedR * fb;

  // --- Sync Logic L ---
  if (!flipEveryFrame) {
    if (lastSampleL <= 0 && inL > 0) { phaseL = 0; flipL = 1; }
    else if (lastSampleL >= 0 && inL < 0) { phaseL = 0; flipL = -1; }
  } else {
    if (lastSampleL <= 0 && inL > 0) { phaseL = 0; flipL = (flipL > 0) ? -1 : 1; }
  }
  lastSampleL = inL;

  // --- Sync Logic R ---
  if (!flipEveryFrame) {
    if (lastSampleR <= 0 && inR > 0) { phaseR = 0; flipR = 1; }
    else if (lastSampleR >= 0 && inR < 0) { phaseR = 0; flipR = -1; }
  } else {
    if (lastSampleR <= 0 && inR > 0) { phaseR = 0; flipR = (flipR > 0) ? -1 : 1; }
  }
  lastSampleR = inR;

  // --- Phase & Linear Decay L ---
  phaseL += speed;
  if (phaseL > limit) {
    phaseL = limit;
    if (noDcIfSilence) {
      if (flipL > 0) flipL = Math.max(0, flipL - linDecay);
      else if (flipL < 0) flipL = Math.min(0, flipL + linDecay);
    }
  } else {
    flipL = flipL >= 0 ? 1 : -1;
  }

  // --- Phase & Linear Decay R ---
  phaseR += speed;
  if (phaseR > limit) {
    phaseR = limit;
    if (noDcIfSilence) {
      if (flipR > 0) flipR = Math.max(0, flipR - linDecay);
      else if (flipR < 0) flipR = Math.min(0, flipR + linDecay);
    }
  } else {
    flipR = flipR >= 0 ? 1 : -1;
  }

  // --- Output ---
  let outL = (noDcIfSilenceHard && phaseL === limit) ? 0 : flipL*phaseL;
  let outR = (noDcIfSilenceHard && phaseR === limit) ? 0 : flipR*phaseR;
  feedL = outL*phaseL;
  feedR = outR*phaseR;

  return [outL * vol, outR * vol];
};
//ends here

//fft thing
function createProcessor(frameSize = 1024, hop = 256) {
  const N     = frameSize;
  const halfN = N >> 1;

  const win = new Float32Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1)));

  const lastPhase = new Float32Array(halfN + 1);
  const sumPhase  = new Float32Array(halfN + 1);
  const re        = new Float32Array(N);
  const im        = new Float32Array(N);
  const expct     = (2 * Math.PI * hop) / N;

  // persistent ring buffers — never reset between calls
  const inBuf  = new Float32Array(N);       // sliding input window
  const outBuf = new Float32Array(N * 4);   // overlap-add output ring
  let   inPos  = 0;   // write head into inBuf
  let   outPos = 0;   // read head out of outBuf
  let   filled = 0;   // samples written since last frame

  function bitRev(n) {
    const r = new Uint32Array(n), bits = Math.log2(n) | 0;
    for (let i = 0; i < n; i++) {
      let x = i, v = 0;
      for (let b = 0; b < bits; b++) { v = (v << 1) | (x & 1); x >>= 1; }
      r[i] = v;
    }
    return r;
  }

  function fft(re, im, inv) {
    const n = re.length, rev = bitRev(n);
    for (let i = 0; i < n; i++) {
      const j = rev[i];
      if (j > i) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
            t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    for (let s = 2; s <= n; s <<= 1) {
      const h = s >> 1, th = (inv ? 2 : -2) * Math.PI / s;
      const wr0 = Math.cos(th), wi0 = Math.sin(th);
      for (let i = 0; i < n; i += s) {
        let wr = 1, wi = 0;
        for (let j = 0; j < h; j++) {
          const er = re[i+j], ei = im[i+j], or = re[i+j+h], oi = im[i+j+h];
          const tr = wr*or - wi*oi, ti = wr*oi + wi*or;
          re[i+j] = er+tr; im[i+j] = ei+ti;
          re[i+j+h] = er-tr; im[i+j+h] = ei-ti;
          const tmp = wr; wr = tmp*wr0 - wi*wi0; wi = tmp*wi0 + wi*wr0;
        }
      }
    }
    if (inv) { const inv1 = 1/n; for (let i = 0; i < n; i++) { re[i] *= inv1; im[i] *= inv1; } }
  }

  function ampShape(k) {
    return N / (k + 1);
    // return Math.max(0, N - k);
    // return 1.0;
  }

  function runFrame(mode) {
    // fill re[] from circular inBuf
    for (let i = 0; i < N; i++) {
      re[i] = inBuf[(inPos - N + i + inBuf.length) % inBuf.length] * win[i];
      im[i] = 0;
    }

    fft(re, im, false);

    for (let k = 0; k <= halfN; k++) {
      const mag   = Math.hypot(re[k], im[k]);
      const phase = Math.atan2(im[k], re[k]);

      let delta = phase - lastPhase[k] - k * expct;
      let qpd   = Math.floor(delta / Math.PI);
      qpd = qpd >= 0 ? qpd + (qpd & 1) : qpd - (qpd & 1);
      delta -= Math.PI * qpd;
      sumPhase[k] += k * expct + delta;
      lastPhase[k] = phase;

      let outMag, outPhase;
      if (mode === 'phase') {
        outMag = ampShape(k)/8; outPhase = sumPhase[k];
      } else if (mode === 'mag') {
        outMag = mag*6; outPhase = Math.PI/2;
      } else {
        outMag = mag; outPhase = sumPhase[k];
      }

      re[k] = outMag * Math.cos(outPhase);
      im[k] = outMag * Math.sin(outPhase);
    }

    for (let k = 1; k < halfN; k++) { re[N-k] = re[k]; im[N-k] = -im[k]; }
    im[halfN] = 0;
    fft(re, im, true);

    // overlap-add into persistent outBuf ring
    const M = outBuf.length;
    for (let i = 0; i < N; i++) {
      outBuf[(outPos + i) % M] += re[i] * win[i];
    }
  }

  // one sample in, one sample out
  function process(t, sr, mode = 'phase') {
    // push sample into circular input
    inBuf[inPos % inBuf.length] = t;
    inPos = (inPos + 1) % inBuf.length;
    filled++;

    // fire a frame every hop samples, once we have enough input
    if (filled >= N && (filled - N) % hop === 0) {
      runFrame(mode);
    }

    // read + clear one sample from output ring
    const M   = outBuf.length;
    const out = outBuf[outPos % M];
    outBuf[outPos % M] = 0;
    outPos = (outPos + 1) % M;

    return out;
  }

  return process;
}

// --- usage ---
let div=2**-5
const processL = createProcessor(1024*div, 256*div);
const processR = createProcessor(1024*div, 256*div);
return function(t, sr, audio) {
  const rawL = processL(audio[0], sr, 'phase');
  const rawR = processL(audio[1], sr, 'phase');
  return [rawL,rawR]
}
