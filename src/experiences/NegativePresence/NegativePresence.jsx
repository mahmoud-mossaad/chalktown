import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import "./NegativePresence.css";

const clamp = (value, minimum, maximum) =>
  Math.min(Math.max(value, minimum), maximum);

const degreesToRadians = (degrees) =>
  (degrees * Math.PI) / 180;

const BAYER_MATRIX = [
  [0, 48, 12, 60, 3, 51, 15, 63],
  [32, 16, 44, 28, 35, 19, 47, 31],
  [8, 56, 4, 52, 11, 59, 7, 55],
  [40, 24, 36, 20, 43, 27, 39, 23],
  [2, 50, 14, 62, 1, 49, 13, 61],
  [34, 18, 46, 30, 33, 17, 45, 29],
  [10, 58, 6, 54, 9, 57, 5, 53],
  [42, 26, 38, 22, 41, 25, 37, 21],
];

function getSupportedRecordingMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  const mimeTypes = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];

  return (
    mimeTypes.find((mimeType) =>
      MediaRecorder.isTypeSupported(mimeType),
    ) || ""
  );
}

function NegativePresence({ onExit }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const recordingPreviewRef = useRef(null);

  const sourceCanvasRef = useRef(null);
  const processedCanvasRef = useRef(null);

  const mediaStreamRef = useRef(null);
  const animationFrameRef = useRef(null);

  const audioContextRef = useRef(null);
  const microphoneSourceRef = useRef(null);
  const analyserRef = useRef(null);
  const audioBufferRef = useRef(null);

  const smoothedSoundRef = useRef(0);
  const burstAmountRef = useRef(0);
  const testBurstRef = useRef(0);
  const effectActiveRef = useRef(false);
  const previousTimestampRef = useRef(0);

  const mediaRecorderRef = useRef(null);
  const recordingStreamRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingUrlRef = useRef("");

  const [started, setStarted] = useState(false);
  const [error, setError] = useState("");

  const [microphoneLevel, setMicrophoneLevel] =
    useState(0);

  const [effectActive, setEffectActive] =
    useState(false);

  const [isRecording, setIsRecording] =
    useState(false);

  const [recordingUrl, setRecordingUrl] =
    useState("");

  const [recordingSeconds, setRecordingSeconds] =
    useState(0);

  // Image processing
  const [imageThreshold, setImageThreshold] =
    useState(124);

  const [contrast, setContrast] =
    useState(2.3);

  const [brightness, setBrightness] =
    useState(-8);

  const [pixelSize, setPixelSize] =
    useState(2);

  const [ditherStrength, setDitherStrength] =
    useState(45);

  const [blurAmount, setBlurAmount] =
    useState(1.4);

  const [meshOpacity, setMeshOpacity] =
    useState(0.15);

  // Microphone response
  const [soundThreshold, setSoundThreshold] =
    useState(0.012);

  const [soundSensitivity, setSoundSensitivity] =
    useState(5);

  const [attackDuration, setAttackDuration] =
    useState(70);

  const [returnDuration, setReturnDuration] =
    useState(900);

  // Ambient idle movement
  const [ambientEffect, setAmbientEffect] =
    useState(0.045);

  // Directional effect
  const [direction, setDirection] =
    useState("right");

  const [directionAngle, setDirectionAngle] =
    useState(-15);

  const [effectStrength, setEffectStrength] =
    useState(2.2);

  const [travelDistance, setTravelDistance] =
    useState(0.18);

  const [trailCount, setTrailCount] =
    useState(12);

  const [trailSpread, setTrailSpread] =
    useState(0.035);

  const [stretchStrength, setStretchStrength] =
    useState(0.2);

  const [shakeStrength, setShakeStrength] =
    useState(0.25);

  const [mirrorCamera, setMirrorCamera] =
    useState(true);

  const [negative, setNegative] =
    useState(true);

  useEffect(() => {
    sourceCanvasRef.current =
      document.createElement("canvas");

    processedCanvasRef.current =
      document.createElement("canvas");
  }, []);

  const updateEffectActive = useCallback(
    (active) => {
      if (effectActiveRef.current === active) {
        return;
      }

      effectActiveRef.current = active;
      setEffectActive(active);
    },
    [],
  );

  const clearRecordingUrl = useCallback(() => {
    if (recordingUrlRef.current) {
      URL.revokeObjectURL(
        recordingUrlRef.current,
      );

      recordingUrlRef.current = "";
    }

    setRecordingUrl("");
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;

    if (
      recorder &&
      recorder.state !== "inactive"
    ) {
      recorder.stop();
    }
  }, []);

  const stopExperience = useCallback(() => {
    stopRecording();

    if (animationFrameRef.current) {
      cancelAnimationFrame(
        animationFrameRef.current,
      );

      animationFrameRef.current = null;
    }

    if (microphoneSourceRef.current) {
      try {
        microphoneSourceRef.current.disconnect();
      } catch {
        // Already disconnected.
      }

      microphoneSourceRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    audioBufferRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      mediaStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (recordingStreamRef.current) {
      recordingStreamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      recordingStreamRef.current = null;
    }

    mediaRecorderRef.current = null;
    recordingChunksRef.current = [];

    smoothedSoundRef.current = 0;
    burstAmountRef.current = 0;
    testBurstRef.current = 0;
    previousTimestampRef.current = 0;

    setMicrophoneLevel(0);
    setRecordingSeconds(0);
    setIsRecording(false);

    updateEffectActive(false);
    setStarted(false);
  }, [
    stopRecording,
    updateEffectActive,
  ]);

  const startExperience = useCallback(async () => {
    setError("");

    try {
      stopExperience();

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Camera and microphone access are not supported by this browser.",
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
            facingMode: "user",
          },

          audio: {
            echoCancellation: true,
            noiseSuppression: false,
            autoGainControl: true,
          },
        });

      mediaStreamRef.current = stream;

      const video = videoRef.current;

      if (!video) {
        throw new Error(
          "The video element could not be initialized.",
        );
      }

      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      await video.play();

      const AudioContextClass =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContextClass) {
        throw new Error(
          "The Web Audio API is not supported.",
        );
      }

      const audioContext =
        new AudioContextClass();

      const analyser =
        audioContext.createAnalyser();

      const microphoneSource =
        audioContext.createMediaStreamSource(
          stream,
        );

      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.35;
      analyser.minDecibels = -100;
      analyser.maxDecibels = -10;

      microphoneSource.connect(analyser);

      audioContextRef.current = audioContext;
      microphoneSourceRef.current =
        microphoneSource;

      analyserRef.current = analyser;

      audioBufferRef.current =
        new Float32Array(analyser.fftSize);

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      previousTimestampRef.current =
        performance.now();

      setStarted(true);
    } catch (caughtError) {
      console.error(caughtError);

      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to start the experience.";

      stopExperience();

      setError(
        `${message} Allow camera and microphone permissions and try again.`,
      );
    }
  }, [stopExperience]);

  const readMicrophoneLevel = useCallback(() => {
    const analyser = analyserRef.current;
    const buffer = audioBufferRef.current;

    if (!analyser || !buffer) {
      return 0;
    }

    analyser.getFloatTimeDomainData(buffer);

    let sumSquares = 0;
    let peak = 0;

    for (
      let index = 0;
      index < buffer.length;
      index += 1
    ) {
      const sample = Math.abs(buffer[index]);

      sumSquares += sample * sample;

      if (sample > peak) {
        peak = sample;
      }
    }

    const rms = Math.sqrt(
      sumSquares / buffer.length,
    );

    return Math.max(
      rms * 3,
      peak * 0.8,
    );
  }, []);

  const calculateCoverCrop = useCallback(
    (
      sourceWidth,
      sourceHeight,
      destinationWidth,
      destinationHeight,
    ) => {
      const sourceRatio =
        sourceWidth / sourceHeight;

      const destinationRatio =
        destinationWidth /
        destinationHeight;

      let sourceX = 0;
      let sourceY = 0;
      let cropWidth = sourceWidth;
      let cropHeight = sourceHeight;

      if (sourceRatio > destinationRatio) {
        cropWidth =
          sourceHeight * destinationRatio;

        sourceX =
          (sourceWidth - cropWidth) / 2;
      } else {
        cropHeight =
          sourceWidth / destinationRatio;

        sourceY =
          (sourceHeight - cropHeight) / 2;
      }

      return {
        sourceX,
        sourceY,
        cropWidth,
        cropHeight,
      };
    },
    [],
  );

  const createProcessedFrame = useCallback(
    (
      video,
      outputWidth,
      outputHeight,
    ) => {
      const sourceCanvas =
        sourceCanvasRef.current;

      const processedCanvas =
        processedCanvasRef.current;

      if (!sourceCanvas || !processedCanvas) {
        return null;
      }

      const processingScale = clamp(
        1 / Math.max(1, pixelSize),
        0.2,
        1,
      );

      const processWidth = Math.max(
        200,
        Math.floor(
          outputWidth * processingScale,
        ),
      );

      const processHeight = Math.max(
        120,
        Math.floor(
          outputHeight * processingScale,
        ),
      );

      if (
        sourceCanvas.width !== processWidth ||
        sourceCanvas.height !== processHeight
      ) {
        sourceCanvas.width = processWidth;
        sourceCanvas.height = processHeight;
      }

      if (
        processedCanvas.width !== processWidth ||
        processedCanvas.height !== processHeight
      ) {
        processedCanvas.width = processWidth;
        processedCanvas.height = processHeight;
      }

      const sourceContext =
        sourceCanvas.getContext("2d", {
          willReadFrequently: true,
        });

      const processedContext =
        processedCanvas.getContext("2d", {
          willReadFrequently: true,
        });

      if (!sourceContext || !processedContext) {
        return null;
      }

      const crop = calculateCoverCrop(
        video.videoWidth,
        video.videoHeight,
        processWidth,
        processHeight,
      );

      sourceContext.save();

      sourceContext.clearRect(
        0,
        0,
        processWidth,
        processHeight,
      );

      if (mirrorCamera) {
        sourceContext.translate(
          processWidth,
          0,
        );

        sourceContext.scale(-1, 1);
      }

      sourceContext.filter = `
        grayscale(1)
        blur(${blurAmount}px)
      `;

      sourceContext.drawImage(
        video,
        crop.sourceX,
        crop.sourceY,
        crop.cropWidth,
        crop.cropHeight,
        0,
        0,
        processWidth,
        processHeight,
      );

      sourceContext.restore();
      sourceContext.filter = "none";

      const imageData =
        sourceContext.getImageData(
          0,
          0,
          processWidth,
          processHeight,
        );

      const pixels = imageData.data;

      for (
        let y = 0;
        y < processHeight;
        y += 1
      ) {
        for (
          let x = 0;
          x < processWidth;
          x += 1
        ) {
          const pixelIndex =
            (y * processWidth + x) * 4;

          let grayscale =
            pixels[pixelIndex] * 0.299 +
            pixels[pixelIndex + 1] * 0.587 +
            pixels[pixelIndex + 2] * 0.114;

          grayscale =
            (grayscale - 128) * contrast +
            128 +
            brightness;

          const matrixValue =
            BAYER_MATRIX[y % 8][x % 8];

          const matrixOffset =
            matrixValue / 63 - 0.5;

          const localThreshold =
            imageThreshold +
            matrixOffset * ditherStrength;

          const normalValue =
            grayscale >= localThreshold
              ? 245
              : 8;

          const value = negative
            ? 255 - normalValue
            : normalValue;

          pixels[pixelIndex] = value;
          pixels[pixelIndex + 1] = value;
          pixels[pixelIndex + 2] = value;
          pixels[pixelIndex + 3] = 255;
        }
      }

      processedContext.putImageData(
        imageData,
        0,
        0,
      );

      return processedCanvas;
    },
    [
      blurAmount,
      brightness,
      calculateCoverCrop,
      contrast,
      ditherStrength,
      imageThreshold,
      mirrorCamera,
      negative,
      pixelSize,
    ],
  );

  const getDirectionVector = useCallback(() => {
    const baseAngle =
      direction === "left" ? 180 : 0;

    const angle =
      baseAngle + directionAngle;

    const radians =
      degreesToRadians(angle);

    return {
      x: Math.cos(radians),
      y: Math.sin(radians),
      radians,
    };
  }, [
    direction,
    directionAngle,
  ]);

  const drawMesh = useCallback(
    (
      context,
      width,
      height,
      ambientAmount,
      reactiveAmount,
      timestamp,
      directionVector,
    ) => {
      if (meshOpacity <= 0) {
        return;
      }

      const time = timestamp * 0.001;

      const idleMovement =
        ambientAmount * 2.5;

      const reactiveMovement =
        reactiveAmount * 8;

      const movement =
        idleMovement + reactiveMovement;

      const offsetX =
        directionVector.x * movement +
        Math.sin(time * 3.2) *
          ambientAmount *
          2 +
        Math.sin(time * 35) *
          reactiveAmount *
          shakeStrength *
          3;

      const offsetY =
        directionVector.y * movement +
        Math.cos(time * 2.8) *
          ambientAmount *
          1.5 +
        Math.cos(time * 31) *
          reactiveAmount *
          shakeStrength *
          3;

      context.save();

      context.globalCompositeOperation =
        negative ? "screen" : "multiply";

      const opacity = clamp(
        meshOpacity *
          (1 + reactiveAmount * 0.45),
        0,
        0.8,
      );

      context.strokeStyle = negative
        ? `rgba(255,255,255,${opacity})`
        : `rgba(0,0,0,${opacity})`;

      context.lineWidth = 0.65;

      for (let y = 0; y < height; y += 4) {
        context.beginPath();

        context.moveTo(
          offsetX,
          y + offsetY + 0.5,
        );

        context.lineTo(
          width + offsetX,
          y + offsetY + 0.5,
        );

        context.stroke();
      }

      context.globalAlpha = 0.5;

      for (let x = 0; x < width; x += 5) {
        context.beginPath();

        context.moveTo(
          x + offsetX + 0.5,
          0,
        );

        context.lineTo(
          x + offsetX + 0.5,
          height,
        );

        context.stroke();
      }

      context.restore();
    },
    [
      meshOpacity,
      negative,
      shakeStrength,
    ],
  );

  const drawDirectionalEffect = useCallback(
    (
      context,
      processedCanvas,
      width,
      height,
      timestamp,
      totalAmount,
      reactiveAmount,
    ) => {
      const background = negative
        ? "#f4f4f4"
        : "#050505";

      context.clearRect(0, 0, width, height);

      context.fillStyle = background;

      context.fillRect(
        0,
        0,
        width,
        height,
      );

      const time = timestamp * 0.001;
      const vector = getDirectionVector();

      const perpendicular = {
        x: -vector.y,
        y: vector.x,
      };

      const ambientAmount = Math.min(
        totalAmount,
        ambientEffect,
      );

      /*
       * Ambient motion is deliberately much weaker.
       * Reactive motion uses the full strength.
       */
      const ambientDistance =
        width *
        travelDistance *
        ambientAmount *
        0.12;

      const soundDistance =
        width *
        travelDistance *
        reactiveAmount *
        effectStrength;

      const maximumDistance =
        ambientDistance + soundDistance;

      const mainAmbientDriftX =
        vector.x *
          ambientDistance *
          0.18 +
        Math.sin(time * 0.65) *
          ambientAmount *
          width *
          0.0025;

      const mainAmbientDriftY =
        vector.y *
          ambientDistance *
          0.18 +
        Math.cos(time * 0.55) *
          ambientAmount *
          height *
          0.002;

      const reactiveShakeDistance =
        reactiveAmount *
        effectStrength *
        Math.min(width, height) *
        0.018 *
        shakeStrength;

      const mainReactiveX =
        vector.x *
          soundDistance *
          0.06 +
        Math.sin(time * 45) *
          reactiveShakeDistance;

      const mainReactiveY =
        vector.y *
          soundDistance *
          0.06 +
        Math.cos(time * 39) *
          reactiveShakeDistance;

      const mainX =
        mainAmbientDriftX +
        mainReactiveX;

      const mainY =
        mainAmbientDriftY +
        mainReactiveY;

      const ambientRotation =
        Math.sin(time * 0.55) *
        ambientAmount *
        0.003;

      const reactiveRotation =
        Math.sin(time * 23) *
        reactiveAmount *
        shakeStrength *
        0.018;

      const mainRotation =
        ambientRotation +
        reactiveRotation;

      const mainScale =
        1 +
        ambientAmount * 0.004 +
        reactiveAmount *
          effectStrength *
          0.025;

      context.save();

      context.translate(
        width / 2 + mainX,
        height / 2 + mainY,
      );

      context.rotate(mainRotation);

      context.scale(
        mainScale,
        mainScale,
      );

      context.imageSmoothingEnabled = false;

      context.drawImage(
        processedCanvas,
        -width / 2,
        -height / 2,
        width,
        height,
      );

      context.restore();

      /*
       * Ambient effect uses only a few faint copies.
       * Sound adds the full trail count.
       */
      if (totalAmount > 0.001) {
        const ambientCopies =
          ambientAmount > 0
            ? Math.max(
                1,
                Math.floor(
                  1 +
                  ambientAmount * 18,
                ),
              )
            : 0;

        const reactiveCopies =
          reactiveAmount > 0.003
            ? Math.floor(
                2 +
                reactiveAmount *
                  trailCount,
              )
            : 0;

        const copies = Math.max(
          ambientCopies,
          reactiveCopies,
        );

        for (
          let index = 0;
          index < copies;
          index += 1
        ) {
          const progress =
            (index + 1) /
            Math.max(1, copies);

          const ambientContribution =
            ambientDistance *
            progress *
            progress;

          const reactiveContribution =
            soundDistance *
            progress *
            progress;

          const distance =
            ambientContribution +
            reactiveContribution;

          const ambientSpread =
            Math.sin(
              time * 0.9 +
                index * 1.4,
            ) *
            width *
            trailSpread *
            ambientAmount *
            0.12 *
            progress;

          const reactiveSpread =
            Math.sin(
              time *
                (1.3 + progress * 1.5) +
                index * 1.7,
            ) *
            width *
            trailSpread *
            reactiveAmount *
            progress;

          const jitter =
            Math.sin(
              time * 24 +
                index * 3.8,
            ) *
            reactiveShakeDistance *
            0.4;

          const spread =
            ambientSpread +
            reactiveSpread +
            jitter;

          const offsetX =
            vector.x * distance +
            perpendicular.x * spread;

          const offsetY =
            vector.y * distance +
            perpendicular.y * spread;

          const ambientStretch =
            ambientAmount *
            stretchStrength *
            progress *
            0.12;

          const reactiveStretch =
            reactiveAmount *
            stretchStrength *
            effectStrength *
            progress;

          const directionalStretch =
            1 +
            ambientStretch +
            reactiveStretch;

          const perpendicularScale =
            1 -
            reactiveAmount *
              stretchStrength *
              progress *
              0.22;

          const ambientCopyRotation =
            Math.sin(
              time * 0.8 +
                index,
            ) *
            ambientAmount *
            0.004;

          const reactiveCopyRotation =
            Math.sin(
              time * 8 +
                index * 1.25,
            ) *
            reactiveAmount *
            shakeStrength *
            0.03 *
            progress;

          const copyRotation =
            ambientCopyRotation +
            reactiveCopyRotation;

          const ambientOpacity =
            ambientAmount *
            (0.045 -
              progress * 0.022);

          const reactiveOpacity =
            reactiveAmount *
            (0.22 -
              progress * 0.15);

          const opacity = clamp(
            ambientOpacity +
            reactiveOpacity,
            0,
            0.24,
          );

          context.save();

          context.globalAlpha = opacity;

          context.globalCompositeOperation =
            index % 5 === 0 &&
            reactiveAmount > 0.03
              ? "difference"
              : negative
                ? "multiply"
                : "screen";

          const blur =
            0.3 +
            ambientAmount *
              progress *
              2 +
            reactiveAmount *
              progress *
              effectStrength *
              13;

          context.filter =
            `blur(${blur}px)`;

          context.translate(
            width / 2 + offsetX,
            height / 2 + offsetY,
          );

          context.rotate(copyRotation);

          context.rotate(vector.radians);

          context.scale(
            directionalStretch,
            perpendicularScale,
          );

          context.rotate(-vector.radians);

          context.drawImage(
            processedCanvas,
            -width / 2,
            -height / 2,
            width,
            height,
          );

          context.restore();
        }
      }

      /*
       * Heavy smear appears only from actual sound.
       */
      if (reactiveAmount > 0.035) {
        const smearCount = Math.floor(
          3 + reactiveAmount * 8,
        );

        for (
          let index = 0;
          index < smearCount;
          index += 1
        ) {
          const progress =
            (index + 1) /
            smearCount;

          const distance =
            soundDistance *
            progress *
            0.92;

          const spread =
            Math.sin(
              time * 6 +
                index * 2.1,
            ) *
            width *
            trailSpread *
            reactiveAmount *
            0.3;

          const offsetX =
            vector.x * distance +
            perpendicular.x * spread;

          const offsetY =
            vector.y * distance +
            perpendicular.y * spread;

          context.save();

          context.globalCompositeOperation =
            negative
              ? "multiply"
              : "screen";

          context.globalAlpha =
            reactiveAmount *
            0.055 *
            (1 - progress * 0.68);

          context.filter = `blur(${
            3 +
            progress *
              effectStrength *
              reactiveAmount *
              15
          }px)`;

          context.translate(
            offsetX,
            offsetY,
          );

          context.drawImage(
            processedCanvas,
            0,
            0,
            width,
            height,
          );

          context.restore();
        }
      }

      drawMesh(
        context,
        width,
        height,
        ambientAmount,
        reactiveAmount,
        timestamp,
        vector,
      );
    },
    [
      ambientEffect,
      drawMesh,
      effectStrength,
      getDirectionVector,
      negative,
      shakeStrength,
      stretchStrength,
      trailCount,
      trailSpread,
      travelDistance,
    ],
  );

  const triggerTestEffect = useCallback(() => {
    testBurstRef.current = 1;
  }, []);

  const startRecording = useCallback(() => {
    setError("");

    try {
      const canvas = canvasRef.current;
      const sourceStream = mediaStreamRef.current;

      if (!canvas || !sourceStream) {
        throw new Error(
          "Start the camera before recording.",
        );
      }

      if (
        typeof canvas.captureStream !== "function"
      ) {
        throw new Error(
          "Canvas recording is not supported by this browser.",
        );
      }

      if (typeof MediaRecorder === "undefined") {
        throw new Error(
          "MediaRecorder is not supported by this browser.",
        );
      }

      clearRecordingUrl();

      const canvasStream =
        canvas.captureStream(30);

      const combinedStream =
        new MediaStream();

      canvasStream
        .getVideoTracks()
        .forEach((track) => {
          combinedStream.addTrack(track);
        });

      sourceStream
        .getAudioTracks()
        .forEach((track) => {
          combinedStream.addTrack(
            track.clone(),
          );
        });

      const mimeType =
        getSupportedRecordingMimeType();

      const recorderOptions = {
        videoBitsPerSecond: 8_000_000,
        audioBitsPerSecond: 128_000,
      };

      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }

      const recorder =
        new MediaRecorder(
          combinedStream,
          recorderOptions,
        );

      recordingChunksRef.current = [];
      recordingStreamRef.current =
        combinedStream;

      recorder.ondataavailable = (event) => {
        if (
          event.data &&
          event.data.size > 0
        ) {
          recordingChunksRef.current.push(
            event.data,
          );
        }
      };

      recorder.onerror = (event) => {
        console.error(
          "Recording error:",
          event,
        );

        setError(
          "A recording error occurred.",
        );
      };

      recorder.onstop = () => {
        const chunks =
          recordingChunksRef.current;

        if (chunks.length > 0) {
          const blobType =
            recorder.mimeType ||
            mimeType ||
            "video/webm";

          const blob = new Blob(chunks, {
            type: blobType,
          });

          const url =
            URL.createObjectURL(blob);

          recordingUrlRef.current = url;
          setRecordingUrl(url);

          if (
            recordingPreviewRef.current
          ) {
            recordingPreviewRef.current.src =
              url;
          }
        }

        if (recordingStreamRef.current) {
          recordingStreamRef.current
            .getTracks()
            .forEach((track) =>
              track.stop(),
            );

          recordingStreamRef.current = null;
        }

        recordingChunksRef.current = [];
        mediaRecorderRef.current = null;

        setIsRecording(false);
      };

      recorder.start(250);

      mediaRecorderRef.current = recorder;

      setRecordingSeconds(0);
      setIsRecording(true);
    } catch (caughtError) {
      console.error(caughtError);

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to start recording.",
      );
    }
  }, [clearRecordingUrl]);

  const downloadRecording = useCallback(() => {
    if (!recordingUrl) {
      return;
    }

    const anchor =
      document.createElement("a");

    const timestamp =
      new Date()
        .toISOString()
        .replace(/[:.]/g, "-");

    anchor.href = recordingUrl;

    anchor.download =
      `directional-camera-${timestamp}.webm`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }, [recordingUrl]);

  useEffect(() => {
    if (!isRecording) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setRecordingSeconds(
        (current) => current + 1,
      );
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isRecording]);

  useEffect(() => {
    if (!started) {
      return undefined;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      return undefined;
    }

    const context = canvas.getContext("2d", {
      alpha: false,
      desynchronized: true,
    });

    if (!context) {
      setError(
        "The browser could not initialize Canvas.",
      );

      return undefined;
    }

    let disposed = false;
    let lastRenderedFrame = 0;
    let lastMeterUpdate = 0;

    const resizeCanvas = () => {
      const rectangle =
        canvas.getBoundingClientRect();

      const pixelRatio = Math.min(
        window.devicePixelRatio || 1,
        1.2,
      );

      const targetWidth = Math.max(
        1,
        Math.floor(
          rectangle.width * pixelRatio,
        ),
      );

      const targetHeight = Math.max(
        1,
        Math.floor(
          rectangle.height * pixelRatio,
        ),
      );

      if (
        canvas.width !== targetWidth ||
        canvas.height !== targetHeight
      ) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }
    };

    const render = (timestamp) => {
      if (disposed) {
        return;
      }

      if (
        timestamp - lastRenderedFrame <
        33
      ) {
        animationFrameRef.current =
          requestAnimationFrame(render);

        return;
      }

      const deltaTime = clamp(
        timestamp -
          (previousTimestampRef.current ||
            timestamp),
        1,
        100,
      );

      previousTimestampRef.current =
        timestamp;

      lastRenderedFrame = timestamp;

      resizeCanvas();

      const rawSound =
        readMicrophoneLevel();

      const soundSmoothingFactor =
        1 -
        Math.exp(
          -deltaTime / 45,
        );

      smoothedSoundRef.current +=
        (rawSound -
          smoothedSoundRef.current) *
        soundSmoothingFactor;

      const smoothedSound =
        smoothedSoundRef.current;

      const normalizedSound = clamp(
        (smoothedSound -
          soundThreshold) *
          soundSensitivity *
          6,
        0,
        1,
      );

      const targetBurst =
        normalizedSound > 0.006
          ? Math.max(
              normalizedSound,
              0.05,
            )
          : 0;

      const isIncreasing =
        targetBurst >
        burstAmountRef.current;

      const effectiveDuration =
        isIncreasing
          ? Math.max(
              10,
              attackDuration,
            )
          : Math.max(
              50,
              returnDuration / 4.6,
            );

      const interpolation =
        1 -
        Math.exp(
          -deltaTime /
            effectiveDuration,
        );

      burstAmountRef.current +=
        (targetBurst -
          burstAmountRef.current) *
        interpolation;

      const testRecoveryTime =
        Math.max(
          50,
          returnDuration / 4.6,
        );

      const testInterpolation =
        1 -
        Math.exp(
          -deltaTime /
            testRecoveryTime,
        );

      testBurstRef.current +=
        (0 - testBurstRef.current) *
        testInterpolation;

      if (
        testBurstRef.current < 0.001
      ) {
        testBurstRef.current = 0;
      }

      if (
        burstAmountRef.current < 0.001
      ) {
        burstAmountRef.current = 0;
      }

      const reactiveAmount = clamp(
        Math.max(
          burstAmountRef.current,
          testBurstRef.current,
        ),
        0,
        1,
      );

      const totalAmount = clamp(
        ambientEffect +
          reactiveAmount *
            (1 - ambientEffect),
        0,
        1,
      );

      if (
        timestamp - lastMeterUpdate >
        60
      ) {
        setMicrophoneLevel(
          clamp(
            smoothedSound *
              soundSensitivity *
              3,
            0,
            1,
          ),
        );

        updateEffectActive(
          reactiveAmount > 0.012,
        );

        lastMeterUpdate = timestamp;
      }

      if (
        video.readyState >=
          HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        const processedCanvas =
          createProcessedFrame(
            video,
            canvas.width,
            canvas.height,
          );

        if (processedCanvas) {
          drawDirectionalEffect(
            context,
            processedCanvas,
            canvas.width,
            canvas.height,
            timestamp,
            totalAmount,
            reactiveAmount,
          );
        }
      }

      animationFrameRef.current =
        requestAnimationFrame(render);
    };

    window.addEventListener(
      "resize",
      resizeCanvas,
    );

    resizeCanvas();

    animationFrameRef.current =
      requestAnimationFrame(render);

    return () => {
      disposed = true;

      window.removeEventListener(
        "resize",
        resizeCanvas,
      );

      if (animationFrameRef.current) {
        cancelAnimationFrame(
          animationFrameRef.current,
        );
      }
    };
  }, [
    ambientEffect,
    attackDuration,
    createProcessedFrame,
    drawDirectionalEffect,
    readMicrophoneLevel,
    returnDuration,
    soundSensitivity,
    soundThreshold,
    started,
    updateEffectActive,
  ]);

  useEffect(() => {
    return () => {
      stopExperience();
      clearRecordingUrl();
    };
  }, [
    clearRecordingUrl,
    stopExperience,
  ]);

  const formattedRecordingTime =
    `${Math.floor(recordingSeconds / 60)
      .toString()
      .padStart(2, "0")}:${(
      recordingSeconds % 60
    )
      .toString()
      .padStart(2, "0")}`;

  return (
    <main className="np-app negative-presence">
      <button type="button" className="negative-presence__return" onClick={() => { stopExperience(); onExit?.(); }}>RETURN TO CHALK TOWN</button>
      <video
        ref={videoRef}
        className="np-source-video"
        aria-hidden="true"
      />

      <canvas
        ref={canvasRef}
        className="np-output-canvas"
      />

      <div
        className={`np-screen-texture ${
          effectActive
            ? "np-screen-texture--active"
            : ""
        }`}
      />

      {!started && (
        <section className="np-intro">
          <p className="np-intro__label">
            DIRECTIONAL AUDIO CAMERA
          </p>

          <h1>
            Directional
            <br />
            impact.
          </h1>

          <p className="np-intro__description">
            The image drifts subtly during
            silence. Sound increases the
            directional displacement, and the
            processed video can be recorded
            together with microphone audio.
          </p>

          <button
            type="button"
            className="np-primary-button"
            onClick={startExperience}
          >
            Start experience
          </button>

          {error && (
            <p className="np-error-message">
              {error}
            </p>
          )}
        </section>
      )}

      {started && (
        <>
          <header className="np-status-bar">
            <span>
              DIRECTIONAL AUDIO CAMERA
            </span>

            <span>
              {isRecording
                ? `RECORDING ${formattedRecordingTime}`
                : effectActive
                  ? "SOUND ACTIVE"
                  : "AMBIENT"}
            </span>
          </header>

          <section className="np-controls">
            <div className="np-control-group">
              <h2>Sound</h2>

              <div className="np-meter">
                <span className="np-control__header">
                  <span>Microphone</span>

                  <output>
                    {Math.round(
                      microphoneLevel * 100,
                    )
                      .toString()
                      .padStart(3, "0")}
                  </output>
                </span>

                <div className="np-meter__track">
                  <span
                    className="np-meter__fill"
                    style={{
                      transform: `scaleX(${microphoneLevel})`,
                    }}
                  />
                </div>
              </div>

              <label className="np-control">
                <span className="np-control__header">
                  <span>Sensitivity</span>

                  <output>
                    {soundSensitivity.toFixed(1)}
                  </output>
                </span>

                <input
                  type="range"
                  min="0.5"
                  max="15"
                  step="0.1"
                  value={soundSensitivity}
                  onChange={(event) =>
                    setSoundSensitivity(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                />
              </label>

              <label className="np-control">
                <span className="np-control__header">
                  <span>Threshold</span>

                  <output>
                    {soundThreshold.toFixed(3)}
                  </output>
                </span>

                <input
                  type="range"
                  min="0"
                  max="0.1"
                  step="0.001"
                  value={soundThreshold}
                  onChange={(event) =>
                    setSoundThreshold(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                />
              </label>

              <label className="np-control">
                <span className="np-control__header">
                  <span>Attack</span>

                  <output>
                    {attackDuration} ms
                  </output>
                </span>

                <input
                  type="range"
                  min="10"
                  max="700"
                  step="10"
                  value={attackDuration}
                  onChange={(event) =>
                    setAttackDuration(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                />
              </label>

              <label className="np-control">
                <span className="np-control__header">
                  <span>Return duration</span>

                  <output>
                    {returnDuration} ms
                  </output>
                </span>

                <input
                  type="range"
                  min="100"
                  max="5000"
                  step="50"
                  value={returnDuration}
                  onChange={(event) =>
                    setReturnDuration(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                />
              </label>

              <label className="np-control">
                <span className="np-control__header">
                  <span>Ambient effect</span>

                  <output>
                    {ambientEffect.toFixed(3)}
                  </output>
                </span>

                <input
                  type="range"
                  min="0"
                  max="0.2"
                  step="0.005"
                  value={ambientEffect}
                  onChange={(event) =>
                    setAmbientEffect(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                />
              </label>
            </div>

            <div className="np-control-group">
              <h2>Direction</h2>

              <label className="np-control">
                <span className="np-control__header">
                  <span>Direction</span>
                </span>

                <select
                  value={direction}
                  onChange={(event) =>
                    setDirection(
                      event.target.value,
                    )
                  }
                >
                  <option value="right">
                    Right
                  </option>

                  <option value="left">
                    Left
                  </option>
                </select>
              </label>

              <label className="np-control">
                <span className="np-control__header">
                  <span>Angle</span>

                  <output>
                    {directionAngle}°
                  </output>
                </span>

                <input
                  type="range"
                  min="-75"
                  max="75"
                  step="1"
                  value={directionAngle}
                  onChange={(event) =>
                    setDirectionAngle(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                />
              </label>

              <label className="np-control">
                <span className="np-control__header">
                  <span>Strength</span>

                  <output>
                    {effectStrength.toFixed(1)}
                  </output>
                </span>

                <input
                  type="range"
                  min="0.2"
                  max="6"
                  step="0.1"
                  value={effectStrength}
                  onChange={(event) =>
                    setEffectStrength(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                />
              </label>

              <label className="np-control">
                <span className="np-control__header">
                  <span>Distance</span>

                  <output>
                    {travelDistance.toFixed(2)}
                  </output>
                </span>

                <input
                  type="range"
                  min="0.01"
                  max="0.5"
                  step="0.01"
                  value={travelDistance}
                  onChange={(event) =>
                    setTravelDistance(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                />
              </label>

              <label className="np-control">
                <span className="np-control__header">
                  <span>Trails</span>

                  <output>{trailCount}</output>
                </span>

                <input
                  type="range"
                  min="2"
                  max="30"
                  step="1"
                  value={trailCount}
                  onChange={(event) =>
                    setTrailCount(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                />
              </label>

              <label className="np-control">
                <span className="np-control__header">
                  <span>Spread</span>

                  <output>
                    {trailSpread.toFixed(3)}
                  </output>
                </span>

                <input
                  type="range"
                  min="0"
                  max="0.2"
                  step="0.005"
                  value={trailSpread}
                  onChange={(event) =>
                    setTrailSpread(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                />
              </label>
            </div>

            <div className="np-control-group">
              <h2>Appearance</h2>

              <label className="np-control">
                <span className="np-control__header">
                  <span>Stretch</span>

                  <output>
                    {stretchStrength.toFixed(2)}
                  </output>
                </span>

                <input
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.01"
                  value={stretchStrength}
                  onChange={(event) =>
                    setStretchStrength(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                />
              </label>

              <label className="np-control">
                <span className="np-control__header">
                  <span>Shake</span>

                  <output>
                    {shakeStrength.toFixed(2)}
                  </output>
                </span>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={shakeStrength}
                  onChange={(event) =>
                    setShakeStrength(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                />
              </label>

              <label className="np-control">
                <span className="np-control__header">
                  <span>Image threshold</span>

                  <output>
                    {imageThreshold}
                  </output>
                </span>

                <input
                  type="range"
                  min="40"
                  max="220"
                  step="1"
                  value={imageThreshold}
                  onChange={(event) =>
                    setImageThreshold(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                />
              </label>

              <label className="np-control">
                <span className="np-control__header">
                  <span>Contrast</span>

                  <output>
                    {contrast.toFixed(2)}
                  </output>
                </span>

                <input
                  type="range"
                  min="0.8"
                  max="4"
                  step="0.05"
                  value={contrast}
                  onChange={(event) =>
                    setContrast(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                />
              </label>

              <label className="np-control">
                <span className="np-control__header">
                  <span>Brightness</span>

                  <output>{brightness}</output>
                </span>

                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  value={brightness}
                  onChange={(event) =>
                    setBrightness(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                />
              </label>

              <label className="np-control">
                <span className="np-control__header">
                  <span>Dither</span>

                  <output>
                    {ditherStrength}
                  </output>
                </span>

                <input
                  type="range"
                  min="0"
                  max="120"
                  step="1"
                  value={ditherStrength}
                  onChange={(event) =>
                    setDitherStrength(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                />
              </label>
            </div>

            <div className="np-actions">
              <button
                type="button"
                className="np-secondary-button"
                onClick={triggerTestEffect}
              >
                Test effect
              </button>

              {!isRecording ? (
                <button
                  type="button"
                  className="np-record-button"
                  onClick={startRecording}
                >
                  Start recording
                </button>
              ) : (
                <button
                  type="button"
                  className="np-record-button np-record-button--active"
                  onClick={stopRecording}
                >
                  Stop {formattedRecordingTime}
                </button>
              )}

              <label className="np-toggle">
                <input
                  type="checkbox"
                  checked={mirrorCamera}
                  onChange={(event) =>
                    setMirrorCamera(
                      event.target.checked,
                    )
                  }
                />

                <span>Mirror</span>
              </label>

              <label className="np-toggle">
                <input
                  type="checkbox"
                  checked={negative}
                  onChange={(event) =>
                    setNegative(
                      event.target.checked,
                    )
                  }
                />

                <span>Negative</span>
              </label>

              <button
                type="button"
                className="np-secondary-button"
                onClick={stopExperience}
              >
                Stop camera
              </button>
            </div>
          </section>

          {recordingUrl && (
            <section className="np-recording-panel">
              <div>
                <span className="np-recording-panel__label">
                  Recording ready
                </span>

                <button
                  type="button"
                  className="np-download-button"
                  onClick={downloadRecording}
                >
                  Download WebM
                </button>
              </div>

              <video
                ref={recordingPreviewRef}
                className="np-recording-preview"
                src={recordingUrl}
                controls
              />
            </section>
          )}
        </>
      )}
    </main>
  );
}

export default NegativePresence;