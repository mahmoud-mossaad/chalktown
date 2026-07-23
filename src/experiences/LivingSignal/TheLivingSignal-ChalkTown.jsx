import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate } from "animejs";
import "./TheLivingSignal-ChalkTown.css";

const FFT_SIZE = 1024;
const POINT_COUNT = 240;
const MAX_PARTICLES = 900;
const TWO_PI = Math.PI * 2;

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

const randomBetween = (minimum, maximum) =>
  minimum + Math.random() * (maximum - minimum);

function App({ onExit }) {
  const canvasRef = useRef(null);
  const visualizerRef = useRef(null);
  const viewportRef = useRef({ width: 1, height: 1, ratio: 1 });

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const waveformDataRef = useRef(null);
  const frequencyDataRef = useRef(null);

  const isRunningRef = useRef(false);
  const previousTimestampRef = useRef(0);

  const timeRef = useRef(0);
  const rotationRef = useRef(0);

  const volumeRef = useRef(0);
  const bassRef = useRef(0);
  const midRef = useRef(0);
  const trebleRef = useRef(0);

  const previousVolumeRef = useRef(0);
  const impactRef = useRef(0);
  const tearRef = useRef(0);
  const shakeRef = useRef(0);
  const lastBurstRef = useRef(0);

  const offsetsRef = useRef(new Float32Array(POINT_COUNT));
  const velocitiesRef = useRef(new Float32Array(POINT_COUNT));
  const targetsRef = useRef(new Float32Array(POINT_COUNT));
  const tearOffsetsRef = useRef(new Float32Array(POINT_COUNT));
  const phaseOffsetsRef = useRef(
    Float32Array.from(
      { length: POINT_COUNT },
      () => Math.random() * TWO_PI
    )
  );

  const particlesRef = useRef([]);
  const orbitDustRef = useRef(
    Array.from({ length: 120 }, () => ({
      angle: Math.random() * TWO_PI,
      radiusScale: randomBetween(1.25, 2.7),
      speed: randomBetween(-0.18, 0.18),
      size: randomBetween(0.3, 1.8),
      opacity: randomBetween(0.08, 0.45),
      phase: Math.random() * TWO_PI,
    }))
  );

  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState("");

  const [sensitivity, setSensitivity] = useState(2.4);
  const [liquidity, setLiquidity] = useState(1.6);
  const [violence, setViolence] = useState(1.5);
  const [particleAmount, setParticleAmount] = useState(1.3);
  const [showControls, setShowControls] = useState(true);

  const settingsRef = useRef({
    sensitivity,
    liquidity,
    violence,
    particleAmount,
  });

  useEffect(() => {
    settingsRef.current = {
      sensitivity,
      liquidity,
      violence,
      particleAmount,
    };
  }, [sensitivity, liquidity, violence, particleAmount]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = visualizerRef.current;

    if (!canvas || !container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    viewportRef.current = { width, height, ratio };

    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = "#000000";
    context.fillRect(0, 0, width, height);
  }, []);

  const analyzeAudio = () => {
    const analyser = analyserRef.current;
    const waveform = waveformDataRef.current;
    const frequencies = frequencyDataRef.current;

    if (
      !isRunningRef.current ||
      !analyser ||
      !waveform ||
      !frequencies
    ) {
      volumeRef.current *= 0.94;
      bassRef.current *= 0.92;
      midRef.current *= 0.92;
      trebleRef.current *= 0.9;
      impactRef.current *= 0.88;

      return;
    }

    analyser.getByteTimeDomainData(waveform);
    analyser.getByteFrequencyData(frequencies);

    let waveformEnergy = 0;

    for (let index = 0; index < waveform.length; index += 1) {
      const sample = (waveform[index] - 128) / 128;
      waveformEnergy += sample * sample;
    }

    const rms = Math.sqrt(waveformEnergy / waveform.length);
    const sensitivityValue = settingsRef.current.sensitivity;

    const rawVolume = clamp(rms * sensitivityValue * 5.8, 0, 1);

    volumeRef.current +=
      (rawVolume - volumeRef.current) *
      (rawVolume > volumeRef.current ? 0.32 : 0.09);

    const averageBand = (startRatio, endRatio) => {
      const start = Math.floor(frequencies.length * startRatio);
      const end = Math.max(
        start + 1,
        Math.floor(frequencies.length * endRatio)
      );

      let sum = 0;

      for (let index = start; index < end; index += 1) {
        sum += frequencies[index];
      }

      return sum / (end - start) / 255;
    };

    const rawBass = averageBand(0, 0.08);
    const rawMid = averageBand(0.08, 0.32);
    const rawTreble = averageBand(0.32, 0.75);

    bassRef.current +=
      (rawBass - bassRef.current) *
      (rawBass > bassRef.current ? 0.35 : 0.1);

    midRef.current +=
      (rawMid - midRef.current) *
      (rawMid > midRef.current ? 0.28 : 0.1);

    trebleRef.current +=
      (rawTreble - trebleRef.current) *
      (rawTreble > trebleRef.current ? 0.38 : 0.13);

    const volumeRise = Math.max(
      0,
      volumeRef.current - previousVolumeRef.current
    );

    previousVolumeRef.current = volumeRef.current;

    const newImpact = clamp(
      volumeRise * 5.5 +
        Math.max(0, rawBass - bassRef.current) * 2.5 +
        rawBass * rawVolume * 0.25,
      0,
      1
    );

    impactRef.current = Math.max(
      newImpact,
      impactRef.current * 0.83
    );
  };

  const triggerTear = (strength) => {
    const tearOffsets = tearOffsetsRef.current;
    const tearCount = Math.floor(
      randomBetween(2, 5) * settingsRef.current.violence
    );

    for (let tearIndex = 0; tearIndex < tearCount; tearIndex += 1) {
      const centerIndex = Math.floor(Math.random() * POINT_COUNT);
      const width = Math.floor(randomBetween(3, 16));
      const direction = Math.random() > 0.45 ? 1 : -1;
      const amplitude =
        randomBetween(25, 95) *
        strength *
        settingsRef.current.violence *
        direction;

      for (let offset = -width; offset <= width; offset += 1) {
        const index =
          (centerIndex + offset + POINT_COUNT) % POINT_COUNT;

        const normalizedDistance = Math.abs(offset) / width;
        const falloff =
          Math.pow(1 - normalizedDistance, 2) *
          Math.sin((1 - normalizedDistance) * Math.PI * 0.5);

        tearOffsets[index] += amplitude * falloff;
      }
    }

    tearRef.current = Math.max(
      tearRef.current,
      strength * settingsRef.current.violence
    );

    shakeRef.current = Math.max(
      shakeRef.current,
      8 + strength * 45 * settingsRef.current.violence
    );
  };

  const emitParticles = (
    centerX,
    centerY,
    baseRadius,
    strength,
    countMultiplier = 1
  ) => {
    const particles = particlesRef.current;
    const particleAmountValue = settingsRef.current.particleAmount;

    const count = Math.floor(
      (8 + strength * 95) *
        particleAmountValue *
        countMultiplier
    );

    for (let particleIndex = 0; particleIndex < count; particleIndex += 1) {
      if (particles.length >= MAX_PARTICLES) {
        particles.shift();
      }

      const angle = Math.random() * TWO_PI;
      const radius = baseRadius + randomBetween(-12, 20);
      const speed =
        randomBetween(30, 180) *
        (0.35 + strength * 1.8);

      const tangentForce = randomBetween(-45, 45) * strength;

      particles.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,

        previousX: centerX + Math.cos(angle) * radius,
        previousY: centerY + Math.sin(angle) * radius,

        vx:
          Math.cos(angle) * speed +
          Math.cos(angle + Math.PI / 2) * tangentForce,

        vy:
          Math.sin(angle) * speed +
          Math.sin(angle + Math.PI / 2) * tangentForce,

        life: 1,
        decay: randomBetween(0.35, 1.25),
        size: randomBetween(0.3, 2.8) * (0.7 + strength),
        drag: randomBetween(0.93, 0.985),
        curl: randomBetween(-2.5, 2.5),
        flicker: Math.random() * TWO_PI,
      });
    }
  };

  const updateLiquidShape = (deltaTime) => {
    const offsets = offsetsRef.current;
    const velocities = velocitiesRef.current;
    const targets = targetsRef.current;
    const tearOffsets = tearOffsetsRef.current;
    const phases = phaseOffsetsRef.current;

    const time = timeRef.current;
    const volume = volumeRef.current;
    const bass = bassRef.current;
    const mid = midRef.current;
    const treble = trebleRef.current;
    const impact = impactRef.current;

    const liquidityValue = settingsRef.current.liquidity;
    const waveform = waveformDataRef.current;

    for (let index = 0; index < POINT_COUNT; index += 1) {
      const angle = (index / POINT_COUNT) * TWO_PI;
      const phase = phases[index];

      let audioSample = 0;

      if (isRunningRef.current && waveform) {
        const waveformIndex = Math.floor(
          (index / POINT_COUNT) * waveform.length
        );

        audioSample =
          (waveform[waveformIndex] - 128) / 128;
      }

      const slowLiquid =
        Math.sin(angle * 2 + time * 0.68 + phase * 0.12) * 8 +
        Math.cos(angle * 3 - time * 0.44 + phase * 0.2) * 6;

      const secondaryLiquid =
        Math.sin(angle * 5 + time * 1.1 + phase) * 4 +
        Math.cos(angle * 8 - time * 0.8 + phase * 0.4) * 2.5;

      const alienPulse =
        Math.sin(
          angle * 4 -
            time * 1.6 +
            Math.sin(time * 0.4) * 2
        ) *
        (2 + mid * 13);

      const fineSurface =
        Math.sin(angle * 17 + time * 3.8 + phase) *
          (0.7 + treble * 7) +
        Math.cos(angle * 23 - time * 2.7 + phase * 0.7) *
          (0.4 + treble * 4);

      const audioDistortion =
        audioSample *
        (12 + volume * 65 + bass * 48) *
        liquidityValue;

      const impactRupture =
        Math.sin(angle * 13 + phase * 3 + time * 6) *
        impact *
        18 *
        settingsRef.current.violence;

      targets[index] =
        (slowLiquid +
          secondaryLiquid +
          alienPulse +
          fineSurface +
          audioDistortion +
          impactRupture) *
          liquidityValue +
        tearOffsets[index];

      tearOffsets[index] *= Math.pow(0.07, deltaTime);

      const leftIndex =
        (index - 1 + POINT_COUNT) % POINT_COUNT;
      const rightIndex = (index + 1) % POINT_COUNT;

      const neighborAverage =
        (offsets[leftIndex] + offsets[rightIndex]) * 0.5;

      const surfaceTension =
        (neighborAverage - offsets[index]) *
        (0.75 + liquidityValue * 0.25);

      const spring =
        (targets[index] - offsets[index]) *
        (7 + liquidityValue * 2);

      velocities[index] +=
        (spring + surfaceTension * 5) * deltaTime;

      velocities[index] *= Math.pow(
        0.035 + liquidityValue * 0.025,
        deltaTime
      );

      offsets[index] += velocities[index] * deltaTime;
    }
  };

  const createShapePoints = (
    centerX,
    centerY,
    baseRadius,
    rotation,
    radialScale = 1,
    distortionScale = 1
  ) => {
    const offsets = offsetsRef.current;
    const points = new Array(POINT_COUNT);

    for (let index = 0; index < POINT_COUNT; index += 1) {
      const previousIndex =
        (index - 1 + POINT_COUNT) % POINT_COUNT;
      const nextIndex = (index + 1) % POINT_COUNT;

      const smoothedOffset =
        offsets[previousIndex] * 0.2 +
        offsets[index] * 0.6 +
        offsets[nextIndex] * 0.2;

      const angle =
        (index / POINT_COUNT) * TWO_PI + rotation;

      const radius = Math.max(
        18,
        baseRadius * radialScale +
          smoothedOffset * distortionScale
      );

      points[index] = {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      };
    }

    return points;
  };

  const traceClosedCurve = (context, points) => {
    const length = points.length;

    const firstPoint = points[0];
    const previousPoint = points[length - 1];

    context.beginPath();
    context.moveTo(
      (previousPoint.x + firstPoint.x) * 0.5,
      (previousPoint.y + firstPoint.y) * 0.5
    );

    for (let index = 0; index < length; index += 1) {
      const current = points[index];
      const next = points[(index + 1) % length];

      const midpointX = (current.x + next.x) * 0.5;
      const midpointY = (current.y + next.y) * 0.5;

      context.quadraticCurveTo(
        current.x,
        current.y,
        midpointX,
        midpointY
      );
    }

    context.closePath();
  };

  const drawMembrane = (
    context,
    points,
    opacity,
    lineWidth,
    blur,
    fillOpacity = 0
  ) => {
    context.save();

    traceClosedCurve(context, points);

    if (fillOpacity > 0) {
      context.fillStyle = `rgba(255, 255, 255, ${fillOpacity})`;
      context.fill();
    }

    context.globalAlpha = opacity;
    context.strokeStyle = "#ffffff";
    context.lineWidth = lineWidth;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.shadowColor = "#ffffff";
    context.shadowBlur = blur;
    context.stroke();

    context.restore();
  };

  const drawInkInterior = (
    context,
    centerX,
    centerY,
    baseRadius,
    rotation
  ) => {
    const time = timeRef.current;
    const volume = volumeRef.current;
    const bass = bassRef.current;

    context.save();
    context.globalCompositeOperation = "screen";

    const tendrilCount = 13;

    for (let index = 0; index < tendrilCount; index += 1) {
      const baseAngle =
        (index / tendrilCount) * TWO_PI +
        rotation * 0.35;

      const innerRadius =
        baseRadius *
        (0.15 +
          Math.sin(time * 0.7 + index) * 0.025);

      const outerRadius =
        baseRadius *
        (0.68 +
          Math.sin(time * 0.9 + index * 1.7) * 0.11 +
          bass * 0.1);

      const startX =
        centerX + Math.cos(baseAngle + time * 0.05) * innerRadius;
      const startY =
        centerY + Math.sin(baseAngle + time * 0.05) * innerRadius;

      const endAngle =
        baseAngle +
        Math.sin(time * 0.8 + index * 2.1) * 0.5;

      const endX =
        centerX + Math.cos(endAngle) * outerRadius;
      const endY =
        centerY + Math.sin(endAngle) * outerRadius;

      const controlAngle =
        baseAngle +
        Math.sin(time * 1.3 + index) * 1.2;

      const controlRadius = baseRadius * 0.45;

      const controlX =
        centerX + Math.cos(controlAngle) * controlRadius;
      const controlY =
        centerY + Math.sin(controlAngle) * controlRadius;

      context.beginPath();
      context.moveTo(startX, startY);
      context.quadraticCurveTo(
        controlX,
        controlY,
        endX,
        endY
      );

      context.strokeStyle = `rgba(255, 255, 255, ${
        0.025 + volume * 0.035
      })`;

      context.lineWidth =
        0.5 + Math.sin(time + index) * 0.2;

      context.shadowColor = "#ffffff";
      context.shadowBlur = 5 + volume * 8;
      context.stroke();
    }

    context.restore();
  };

  const drawAlienCore = (
    context,
    centerX,
    centerY,
    baseRadius
  ) => {
    const time = timeRef.current;
    const volume = volumeRef.current;
    const bass = bassRef.current;
    const impact = impactRef.current;

    const pulse =
      1 +
      Math.sin(time * 1.5) * 0.05 +
      bass * 0.2 +
      impact * 0.15;

    const coreRadius = baseRadius * 0.25 * pulse;

    context.save();

    const gradient = context.createRadialGradient(
      centerX - coreRadius * 0.18,
      centerY - coreRadius * 0.2,
      coreRadius * 0.05,
      centerX,
      centerY,
      coreRadius
    );

    gradient.addColorStop(
      0,
      `rgba(255,255,255,${0.2 + volume * 0.25})`
    );
    gradient.addColorStop(
      0.18,
      `rgba(255,255,255,${0.06 + volume * 0.08})`
    );
    gradient.addColorStop(0.55, "rgba(10,10,10,0.9)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");

    context.fillStyle = gradient;
    context.beginPath();
    context.arc(
      centerX,
      centerY,
      coreRadius * 1.8,
      0,
      TWO_PI
    );
    context.fill();

    context.beginPath();
    context.arc(
      centerX,
      centerY,
      coreRadius,
      0,
      TWO_PI
    );

    context.fillStyle = "#000000";
    context.shadowColor = "#ffffff";
    context.shadowBlur =
      8 + volume * 25 + impact * 40;
    context.fill();

    context.lineWidth = 0.7 + volume;
    context.strokeStyle = `rgba(255,255,255,${
      0.18 + volume * 0.35
    })`;
    context.stroke();

    const eyeRadius =
      1.2 + bass * 4 + impact * 5;

    context.beginPath();
    context.arc(
      centerX +
        Math.sin(time * 0.7) * coreRadius * 0.12,
      centerY +
        Math.cos(time * 0.6) * coreRadius * 0.08,
      eyeRadius,
      0,
      TWO_PI
    );

    context.fillStyle = "rgba(255,255,255,0.95)";
    context.shadowBlur = 16 + volume * 30;
    context.fill();

    context.restore();
  };

  const updateAndDrawParticles = (
    context,
    deltaTime,
    centerX,
    centerY
  ) => {
    const particles = particlesRef.current;

    context.save();
    context.globalCompositeOperation = "screen";

    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];

      particle.previousX = particle.x;
      particle.previousY = particle.y;

      const dx = particle.x - centerX;
      const dy = particle.y - centerY;
      const distance = Math.max(1, Math.hypot(dx, dy));

      const tangentX = -dy / distance;
      const tangentY = dx / distance;

      particle.vx += tangentX * particle.curl * deltaTime * 20;
      particle.vy += tangentY * particle.curl * deltaTime * 20;

      particle.vx *= Math.pow(particle.drag, deltaTime * 60);
      particle.vy *= Math.pow(particle.drag, deltaTime * 60);

      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;

      particle.life -= particle.decay * deltaTime;
      particle.flicker += deltaTime * 12;

      if (particle.life <= 0) {
        particles.splice(index, 1);
        continue;
      }

      const alpha =
        particle.life *
        (0.5 + Math.sin(particle.flicker) * 0.2);

      context.beginPath();
      context.moveTo(
        particle.previousX,
        particle.previousY
      );
      context.lineTo(particle.x, particle.y);

      context.strokeStyle = `rgba(255,255,255,${alpha * 0.45})`;
      context.lineWidth = Math.max(
        0.25,
        particle.size * particle.life * 0.65
      );
      context.shadowColor = "#ffffff";
      context.shadowBlur = particle.size * 3;
      context.stroke();

      context.beginPath();
      context.arc(
        particle.x,
        particle.y,
        Math.max(0.2, particle.size * particle.life),
        0,
        TWO_PI
      );

      context.fillStyle = `rgba(255,255,255,${alpha})`;
      context.fill();
    }

    context.restore();
  };

  const drawOrbitDust = (
    context,
    centerX,
    centerY,
    baseRadius
  ) => {
    const dust = orbitDustRef.current;
    const time = timeRef.current;
    const volume = volumeRef.current;
    const impact = impactRef.current;

    context.save();
    context.globalCompositeOperation = "screen";

    for (const particle of dust) {
      const angle =
        particle.angle +
        time * particle.speed +
        Math.sin(time * 0.25 + particle.phase) * 0.18;

      const radius =
        baseRadius *
        (particle.radiusScale +
          Math.sin(time * 0.7 + particle.phase) * 0.08 +
          impact * 0.12);

      const ellipseScale =
        0.62 +
        Math.sin(particle.phase + time * 0.2) * 0.1;

      const x = centerX + Math.cos(angle) * radius;
      const y =
        centerY + Math.sin(angle) * radius * ellipseScale;

      const alpha =
        particle.opacity *
        (0.35 + volume * 0.65) *
        (0.6 + Math.sin(time * 2 + particle.phase) * 0.3);

      context.beginPath();
      context.arc(
        x,
        y,
        particle.size * (0.65 + impact * 0.7),
        0,
        TWO_PI
      );

      context.fillStyle = `rgba(255,255,255,${alpha})`;
      context.fill();
    }

    context.restore();
  };

  const drawTearSlices = (
    context,
    centerX,
    centerY,
    baseRadius
  ) => {
    const tear = tearRef.current;

    if (tear < 0.04) {
      return;
    }

    const sliceCount = 3;

    context.save();
    context.globalCompositeOperation = "screen";

    for (let index = 0; index < sliceCount; index += 1) {
      const yOffset =
        Math.sin(timeRef.current * 13 + index * 2.1) *
        baseRadius *
        0.6;

      const width =
        baseRadius *
        randomBetween(0.45, 1.25);

      const height = randomBetween(1, 5);
      const displacement =
        Math.sin(timeRef.current * 18 + index) *
        tear *
        38;

      context.fillStyle = `rgba(255,255,255,${
        tear * randomBetween(0.05, 0.2)
      })`;

      context.fillRect(
        centerX - width * 0.5 + displacement,
        centerY + yOffset,
        width,
        height
      );
    }

    context.restore();
  };

  const drawScene = useCallback((timestamp) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    const { width, height } = viewportRef.current;

    const previousTimestamp = previousTimestampRef.current;
    const deltaTime = clamp(
      previousTimestamp
        ? (timestamp - previousTimestamp) / 1000
        : 1 / 60,
      1 / 240,
      1 / 20
    );

    previousTimestampRef.current = timestamp;
    timeRef.current += deltaTime;

    analyzeAudio();

    const volume = volumeRef.current;
    const bass = bassRef.current;
    const impact = impactRef.current;

    const burstThreshold =
      0.2 / settingsRef.current.violence;

    if (
      impact > burstThreshold &&
      timestamp - lastBurstRef.current > 100
    ) {
      triggerTear(clamp(impact * 1.7, 0.25, 1));

      lastBurstRef.current = timestamp;
    }

    tearRef.current *= Math.pow(0.05, deltaTime);
    shakeRef.current *= Math.pow(0.025, deltaTime);

    updateLiquidShape(deltaTime);

    context.fillStyle = "rgba(0,0,0,0.2)";
    context.fillRect(0, 0, width, height);

    const baseCenterX = width / 2;
    const baseCenterY = height / 2;

    const ambientDriftX =
      Math.sin(timeRef.current * 0.34) * 12 +
      Math.cos(timeRef.current * 0.71) * 5;

    const ambientDriftY =
      Math.cos(timeRef.current * 0.29) * 10 +
      Math.sin(timeRef.current * 0.58) * 6;

    const shakeAngle =
      timeRef.current * 47 +
      Math.sin(timeRef.current * 9);

    const shakeX =
      Math.cos(shakeAngle) *
      shakeRef.current *
      randomBetween(0.5, 1);

    const shakeY =
      Math.sin(shakeAngle * 1.17) *
      shakeRef.current *
      randomBetween(0.5, 1);

    const centerX =
      baseCenterX + ambientDriftX + shakeX;
    const centerY =
      baseCenterY + ambientDriftY + shakeY;

    const baseRadius =
      Math.min(width, height) *
      (0.145 +
        Math.sin(timeRef.current * 1.05) * 0.006) +
      volume * 30 +
      bass * 22 +
      impact * 24;

    rotationRef.current +=
      deltaTime *
      (0.08 + volume * 0.28 + impact * 0.8);

    if (
      volume > 0.15 &&
      Math.random() <
        deltaTime *
          volume *
          4 *
          settingsRef.current.particleAmount
    ) {
      emitParticles(
        centerX,
        centerY,
        baseRadius,
        volume * 0.45,
        0.12
      );
    }

    if (impact > 0.12) {
      emitParticles(
        centerX,
        centerY,
        baseRadius,
        clamp(impact * 1.4, 0, 1),
        0.35
      );
    }

    drawOrbitDust(context, centerX, centerY, baseRadius);

    const outerGhost = createShapePoints(
      centerX + Math.sin(timeRef.current * 2.2) * 5,
      centerY + Math.cos(timeRef.current * 1.8) * 4,
      baseRadius,
      rotationRef.current - 0.035,
      1.1,
      0.72
    );

    const middleGhost = createShapePoints(
      centerX - Math.cos(timeRef.current * 1.9) * 4,
      centerY + Math.sin(timeRef.current * 2.4) * 3,
      baseRadius,
      rotationRef.current + 0.025,
      1.04,
      0.88
    );

    const mainShape = createShapePoints(
      centerX,
      centerY,
      baseRadius,
      rotationRef.current,
      1,
      1
    );

    drawMembrane(
      context,
      outerGhost,
      0.06 + volume * 0.07,
      7 + volume * 5,
      35 + volume * 45
    );

    drawMembrane(
      context,
      middleGhost,
      0.13 + volume * 0.1,
      2.4 + volume * 2,
      18 + volume * 28
    );

    drawMembrane(
      context,
      mainShape,
      0.88,
      1.15 + volume * 1.8 + impact * 2.5,
      7 + volume * 22 + impact * 32,
      0.012 + volume * 0.018
    );

    drawInkInterior(
      context,
      centerX,
      centerY,
      baseRadius,
      rotationRef.current
    );

    drawAlienCore(
      context,
      centerX,
      centerY,
      baseRadius
    );

    drawTearSlices(
      context,
      centerX,
      centerY,
      baseRadius
    );

    updateAndDrawParticles(
      context,
      deltaTime,
      centerX,
      centerY
    );

    animationFrameRef.current =
      requestAnimationFrame(drawScene);
  }, []);

  const startMicrophone = async () => {
    try {
      setError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Microphone access is not supported by this browser."
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });

      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) {
        throw new Error(
          "The Web Audio API is not supported."
        );
      }

      const audioContext = new AudioContextClass();

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const analyser = audioContext.createAnalyser();

      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.62;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;

      const microphone =
        audioContext.createMediaStreamSource(stream);

      microphone.connect(analyser);

      streamRef.current = stream;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      microphoneRef.current = microphone;

      waveformDataRef.current = new Uint8Array(
        analyser.fftSize
      );

      frequencyDataRef.current = new Uint8Array(
        analyser.frequencyBinCount
      );

      isRunningRef.current = true;
      setIsRunning(true);

      triggerTear(0.38);

      animate(visualizerRef.current, {
        scale: [1, 1.025, 1],
        rotate: ["0deg", "-0.35deg", "0deg"],
        duration: 750,
        ease: "outElastic(1, .45)",
      });
    } catch (microphoneError) {
      console.error(microphoneError);

      if (
        microphoneError.name === "NotAllowedError" ||
        microphoneError.name === "PermissionDeniedError"
      ) {
        setError(
          "Microphone permission was denied. Allow microphone access and try again."
        );
      } else {
        setError(
          microphoneError.message ||
            "The microphone could not be started."
        );
      }
    }
  };

  const stopMicrophone = async () => {
    isRunningRef.current = false;
    setIsRunning(false);

    if (microphoneRef.current) {
      try {
        microphoneRef.current.disconnect();
      } catch {
        // The node may already be disconnected.
      }

      microphoneRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close();
      } catch {
        // The context may already be closed.
      }

      audioContextRef.current = null;
    }

    analyserRef.current = null;
    waveformDataRef.current = null;
    frequencyDataRef.current = null;
  };

  useLayoutEffect(() => {
    resizeCanvas();

    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      resizeCanvas();
      secondFrame = requestAnimationFrame(resizeCanvas);
    });

    const observer = new ResizeObserver(resizeCanvas);
    if (visualizerRef.current) observer.observe(visualizerRef.current);

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("orientationchange", resizeCanvas);

    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      observer.disconnect();
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("orientationchange", resizeCanvas);
    };
  }, [resizeCanvas]);

  useEffect(() => {
    animate(visualizerRef.current, {
      opacity: [0, 1],
      scale: [0.96, 1],
      duration: 900,
      ease: "outExpo",
    });

    animationFrameRef.current = requestAnimationFrame(drawScene);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [drawScene]);

  return (
    <main className="visualizer">
      <div
        ref={visualizerRef}
        className="canvas-container"
      >
        <canvas ref={canvasRef} />
      </div>

      <button
        type="button"
        className="interface-toggle"
        onClick={() =>
          setShowControls((current) => !current)
        }
        aria-label={
          showControls
            ? "Hide visualizer controls"
            : "Show visualizer controls"
        }
      >
        {showControls ? "×" : "+"}
      </button>

      <button
        type="button"
        className="return-button"
        onClick={onExit}
        aria-label="Return to Chalk Town"
      >
        RETURN
      </button>

      <section
        className={`controls ${
          showControls ? "controls-visible" : ""
        }`}
      >
        <button
          type="button"
          className="microphone-button"
          onClick={
            isRunning
              ? stopMicrophone
              : startMicrophone
          }
        >
          <span
            className={`microphone-indicator ${
              isRunning ? "active" : ""
            }`}
          />

          {isRunning ? "Silence entity" : "Awaken entity"}
        </button>

        <div className="settings-panel">
          <label>
            <span>Sensitivity</span>

            <input
              type="range"
              min="0.5"
              max="5"
              step="0.1"
              value={sensitivity}
              onChange={(event) =>
                setSensitivity(
                  Number(event.target.value)
                )
              }
            />
          </label>

          <label>
            <span>Liquidity</span>

            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={liquidity}
              onChange={(event) =>
                setLiquidity(
                  Number(event.target.value)
                )
              }
            />
          </label>

          <label>
            <span>Violence</span>

            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={violence}
              onChange={(event) =>
                setViolence(
                  Number(event.target.value)
                )
              }
            />
          </label>

          <label>
            <span>Dust</span>

            <input
              type="range"
              min="0"
              max="3"
              step="0.1"
              value={particleAmount}
              onChange={(event) =>
                setParticleAmount(
                  Number(event.target.value)
                )
              }
            />
          </label>
        </div>

        {error && <p className="error-message">{error}</p>}
      </section>
    </main>
  );
}

export default App;