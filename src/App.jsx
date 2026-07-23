import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, Line, Text } from '@react-three/drei'
import { animate } from 'animejs'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { projects } from './projects'
import LivingSignal from './experiences/LivingSignal/TheLivingSignal-ChalkTown.jsx'
import NegativePresence from './experiences/NegativePresence/NegativePresence.jsx'

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

function useDeviceMode() {
  const getMode = () => {
    const width = window.innerWidth
    const hasTouch = navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches
    if (width <= 800) return 'mobile'
    if (width <= 1180 || (hasTouch && width <= 1366)) return 'tablet'
    return 'desktop'
  }

  const [mode, setMode] = useState(getMode)

  useEffect(() => {
    const update = () => setMode(getMode())
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return mode
}

function Dust({ isMobile, isTablet }) {
  const points = useRef()
  const positions = useMemo(() => {
    const particleCount = isMobile ? 4000 : isTablet ? 6000 : 20000
    const result = new Float32Array(particleCount * 3)
    for (let i = 0; i < result.length; i += 3) {
      result[i] = (Math.random() - 0.5) * 32
      result[i + 1] = (Math.random() - 0.5) * 18
      result[i + 2] = -Math.random() * 70 + 6
    }
    return result
  }, [isMobile, isTablet])

  useFrame(({ clock, pointer }) => {
    if (!points.current) return
    points.current.rotation.y = clock.elapsedTime * 0.006 + pointer.x * 0.03
    points.current.rotation.x = pointer.y * 0.015
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#d9d9d9"
        size={isMobile ? 0.018 : isTablet ? 0.016 : 0.013}
        transparent
        opacity={0.90}
        sizeAttenuation
        depthWrite={true}
      />
    </points>
  )
}

const runeShapes = {
  signal: [
    [[0, -0.62], [0, 0.62]], [[0, 0.18], [-0.38, 0.55]], [[0, 0.18], [0.38, 0.55]],
  ],
  presence: [
    [[-0.18, -0.62], [-0.18, 0.62]], [[-0.18, 0.14], [0.32, -0.18]],
  ],
  ashes: [
    [[-0.28, -0.62], [-0.28, 0.62]], [[-0.28, 0.02], [0.36, 0.54]], [[-0.28, 0.02], [0.36, -0.54]],
  ],
  forest: [
    [[-0.42, 0.5], [0.42, 0.5]], [[0, 0.5], [0, -0.62]], [[0, 0.03], [-0.34, -0.25]], [[0, 0.03], [0.34, -0.25]],
  ],
  matter: [
    [[0, 0.62], [-0.42, 0.12]], [[-0.42, 0.12], [0, -0.34]],
    [[0, -0.34], [0.42, 0.12]], [[0.42, 0.12], [0, 0.62]],
    [[-0.42, 0.12], [-0.42, -0.62]], [[0.42, 0.12], [0.42, -0.62]],
  ],
  city: [
    [[-0.42, -0.52], [0.42, 0.52]], [[-0.42, 0.52], [0.42, -0.52]],
    [[-0.42, -0.52], [-0.42, 0.52]], [[0.42, -0.52], [0.42, 0.52]],
  ],
  about: [
    [[0, -0.62], [0, 0.62]], [[-0.38, 0.28], [0, -0.02], [0.38, 0.28]], [[-0.38, -0.28], [0, -0.02], [0.38, -0.28]],
  ],
}

function RuneMark({ id, opacity = 1, scale = 1 }) {
  const segments = runeShapes[id] || runeShapes.about
  return (
    <group scale={scale} position={[0, 0, 0.055]}>
      {segments.map((segment, index) => (
        <Line
          key={`${id}-${index}`}
          points={segment.map(([x, y]) => [x, y, 0])}
          color="#050505"
          lineWidth={3.4}
          transparent
          opacity={opacity}
          depthTest={false}
          renderOrder={20}
        />
      ))}
    </group>
  )
}

function Portal({ project, index, activeIndex, onOpen, journey, isMobile, isTablet }) {
  const group = useRef()
  const halo = useRef()
  const compact = isMobile || isTablet
  const z = isMobile ? -6 - index * 6.5 : isTablet ? -8 - index * 7.4 : -10 - index * 9.5
  const side = index % 2 === 0 ? -1 : 1
  const x = compact ? 0 : side * (2.2 + (index % 3) * 0.35)
  const y = compact ? 0 : Math.sin(index * 1.7) * 0.8
  const isActive = activeIndex === index
  const compactVisible = !compact || isActive
  const face = useRef()
  const numberLabel = useRef()
  const titleLabel = useRef()
  const subtitleLabel = useRef()

  useFrame(({ clock, pointer }) => {
    if (!group.current || !halo.current || !face.current) return
    const t = clock.elapsedTime
    group.current.rotation.y = THREE.MathUtils.lerp(
      group.current.rotation.y,
      pointer.x * 0.08 * side,
      0.035,
    )
    group.current.position.y = y + Math.sin(t * 0.55 + index) * 0.08
    halo.current.rotation.z += 0.0015 * (index % 2 ? 1 : -1)
    group.current.visible = compactVisible
    if (compact && !isActive) return

    const chapterPosition = (index + 1) / (projects.length + 1)
    const distanceFromChapter = Math.abs(journey.current - chapterPosition)
    const distanceEmergence = 1 - THREE.MathUtils.smoothstep(
      distanceFromChapter,
      0.055,
      0.125,
    )
    const emergence = compact ? 1 : distanceEmergence
    const targetFaceOpacity = emergence * (isActive ? 0.96 : 0.72)

    face.current.material.opacity = THREE.MathUtils.lerp(
      face.current.material.opacity,
      targetFaceOpacity,
      0.055,
    )
    halo.current.material.opacity = THREE.MathUtils.lerp(
      halo.current.material.opacity,
      emergence * (isActive ? 0.8 : 0.16),
      0.055,
    )
    ;[numberLabel, titleLabel, subtitleLabel].forEach((labelRef) => {
      if (labelRef.current?.material) {
        labelRef.current.material.transparent = true
        labelRef.current.material.opacity = THREE.MathUtils.lerp(
          labelRef.current.material.opacity,
          emergence,
          0.07,
        )
      }
    })

    const scale = isMobile ? 0.82 : isTablet ? 0.94 : 0.72 + emergence * 0.28
    group.current.scale.setScalar(THREE.MathUtils.lerp(group.current.scale.x, scale, compact ? 0.12 : 0.045))
  })

  return (
    <group ref={group} position={[x, y, z]} scale={isMobile ? 0.92 : isTablet ? 1.02 : 1} visible={compactVisible}>
      <Float speed={1.1} rotationIntensity={0.12} floatIntensity={0.18}>
        <mesh
          ref={face}
          onClick={(event) => {
            event.stopPropagation()
            onOpen(index)
          }}
          onPointerOver={() => (document.body.style.cursor = 'pointer')}
          onPointerOut={() => (document.body.style.cursor = 'default')}
        >
          <circleGeometry args={[isMobile ? 0.92 : isTablet ? 1.04 : 1.12, 96]} />
          <meshBasicMaterial color="#f1f1ed" transparent opacity={0} />
        </mesh>

        <mesh ref={halo} position={[0, 0, -0.02]}>
          <ringGeometry args={isMobile ? [1.02, 1.055, 100] : isTablet ? [1.15, 1.19, 100] : [1.24, 1.27, 100]} />
          <meshBasicMaterial color="white" transparent opacity={0.2} side={THREE.DoubleSide} />
        </mesh>

        <RuneMark id={project.id} opacity={compact ? (isActive ? 1 : 0) : 1} scale={isMobile ? 0.63 : isTablet ? 0.72 : 0.78} />
      </Float>

      <Text
        ref={numberLabel}
        position={isMobile ? [0, -1.28, 0] : isTablet ? [0, -1.46, 0] : [side * -1.65, 0.24, 0]}
        fontSize={0.13}
        letterSpacing={0.12}
        color="#777"
        anchorX={compact ? 'center' : side === -1 ? 'left' : 'right'}
      >
        {project.number}
      </Text>
      <Text
        ref={titleLabel}
        position={isMobile ? [0, -1.52, 0] : isTablet ? [0, -1.75, 0] : [side * -1.65, -0.04, 0]}
        fontSize={isMobile ? 0.21 : isTablet ? 0.25 : 0.25}
        letterSpacing={0.025}
        color={isActive ? '#fff' : '#b7b7b7'}
        anchorX={compact ? 'center' : side === -1 ? 'left' : 'right'}
      >
        {project.title.toUpperCase()}
      </Text>
      <Text
        ref={subtitleLabel}
        position={isMobile ? [0, -1.79, 0] : isTablet ? [0, -2.08, 0] : [side * -1.65, -0.35, 0]}
        fontSize={isMobile ? 0.072 : isTablet ? 0.09 : 0.105}
        letterSpacing={0.035}
        color="#666"
        anchorX={compact ? 'center' : side === -1 ? 'left' : 'right'}
      >
        {project.subtitle.toUpperCase()}
      </Text>
    </group>
  )
}

function AboutPortal({ activeIndex, journey, isMobile, isTablet }) {
  const group = useRef()
  const face = useRef()
  const halo = useRef()
  const labels = [useRef(), useRef(), useRef(), useRef()]
  const index = projects.length
  const compact = isMobile || isTablet
  const z = isMobile ? -45 : isTablet ? -52.4 : -61.5

  useFrame(({ clock, pointer }) => {
    if (!group.current || !face.current || !halo.current) return
    const isActive = activeIndex === index
    group.current.visible = !compact || isActive
    if (compact && !isActive) return
    const chapterPosition = 1
    const distance = Math.abs(journey.current - chapterPosition)
    const emergence = compact ? 1 : 1 - THREE.MathUtils.smoothstep(distance, 0.045, 0.12)
    group.current.position.y = Math.sin(clock.elapsedTime * 0.5) * 0.07
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, pointer.x * 0.05, 0.03)
    face.current.material.opacity = THREE.MathUtils.lerp(face.current.material.opacity, emergence * 0.96, 0.06)
    halo.current.material.opacity = THREE.MathUtils.lerp(halo.current.material.opacity, emergence * (isActive ? 0.75 : 0.15), 0.06)
    labels.forEach((ref) => {
      if (ref.current?.material) {
        ref.current.material.transparent = true
        ref.current.material.opacity = THREE.MathUtils.lerp(ref.current.material.opacity, emergence, 0.07)
      }
    })
  })

  return (
    <group ref={group} position={[0, 0, z]} scale={isMobile ? 0.88 : isTablet ? 0.98 : 1} visible={!compact || activeIndex === index}>
      <Float speed={0.8} rotationIntensity={0.08} floatIntensity={0.12}>
        <mesh ref={face}>
          <circleGeometry args={[isMobile ? 0.92 : isTablet ? 1.04 : 1.12, 96]} />
          <meshBasicMaterial color="#f1f1ed" transparent opacity={0} />
        </mesh>
        <mesh ref={halo} position={[0, 0, -0.02]}>
          <ringGeometry args={isMobile ? [1.02, 1.055, 100] : isTablet ? [1.15, 1.19, 100] : [1.24, 1.27, 100]} />
          <meshBasicMaterial color="white" transparent opacity={0} side={THREE.DoubleSide} />
        </mesh>
        <RuneMark id="about" opacity={!compact || activeIndex === index ? 1 : 0} scale={isMobile ? 0.63 : isTablet ? 0.72 : 0.78} />
      </Float>
      <Text ref={labels[0]} position={[0, isMobile ? 1.25 : isTablet ? 1.48 : 1.75, 0]} fontSize={isMobile ? 0.09 : isTablet ? 0.105 : 0.12} letterSpacing={0.18} color="#777" anchorX="center">07 — ABOUT</Text>
      <Text ref={labels[1]} position={[0, isMobile ? -1.25 : isTablet ? -1.48 : -1.65, 0]} fontSize={isMobile ? 0.24 : isTablet ? 0.29 : 0.34} letterSpacing={0.02} color="#fff" anchorX="center">CHALK TOWN</Text>
      <Text ref={labels[2]} position={[0, isMobile ? -1.58 : isTablet ? -1.88 : -2.08, 0]} maxWidth={isMobile ? 4.8 : isTablet ? 5.7 : 6.4} textAlign="center" fontSize={isMobile ? 0.08 : isTablet ? 0.098 : 0.115} lineHeight={1.6} color="#8c8c8c" anchorX="center">
        A MONOCHROME ARCHIVE OF INTERACTIVE EXPERIMENTS.
      </Text>
      <Text ref={labels[3]} position={[0, isMobile ? -2.02 : isTablet ? -2.35 : -2.66, 0]} maxWidth={isMobile ? 4.8 : isTablet ? 6.2 : 7.2} textAlign="center" fontSize={isMobile ? 0.062 : isTablet ? 0.075 : 0.085} lineHeight={1.7} color="#555" anchorX="center">
        SOUND · GESTURE · MEMORY · DESTRUCTION · NATURE · INVISIBLE FORCES
      </Text>
    </group>
  )
}

function JourneyPath() {
  const points = useMemo(() => {
    const result = []
    for (let i = 0; i < projects.length + 2; i += 1) {
      result.push(new THREE.Vector3(Math.sin(i * 1.4) * 0.35, Math.cos(i) * 0.16, -i * 9.5))
    }
    return result
  }, [])

  return <Line points={points} color="#303030" lineWidth={0.45} transparent opacity={0.5} />
}

function CameraRig({ journey, targetJourney, isMobile, isTablet, activeIndex }) {
  const { camera, pointer } = useThree()

  useFrame(() => {
    const compact = isMobile || isTablet
    journey.current = THREE.MathUtils.lerp(journey.current, targetJourney.current, compact ? 0.09 : 0.032)
    const compactPortalZ = activeIndex === projects.length
      ? (isMobile ? -45 : -52.4)
      : (isMobile ? -6 - activeIndex * 6.5 : -8 - activeIndex * 7.4)
    const z = compact ? compactPortalZ + (isMobile ? 5.1 : 5.8) : 4 - journey.current * 58
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, z, compact ? 0.09 : 0.045)
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, compact ? 0 : pointer.x * 0.5, 0.025)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, compact ? 0 : pointer.y * 0.28, 0.025)
    camera.lookAt(compact ? 0 : pointer.x * 0.16, isMobile ? -0.35 : isTablet ? -0.25 : pointer.y * 0.1, camera.position.z - 8)
  })

  return null
}

function Scene({ journey, targetJourney, activeIndex, onOpen, isMobile, isTablet }) {
  return (
    <>
      <color attach="background" args={['#030303']} />
      <fog attach="fog" args={['#030303', 7, 20]} />
      <CameraRig journey={journey} targetJourney={targetJourney} isMobile={isMobile} isTablet={isTablet} activeIndex={activeIndex} />
      <Dust isMobile={isMobile} isTablet={isTablet} />
      {!isMobile && !isTablet && <JourneyPath />}
      {projects.map((project, index) => (
        <Portal
          key={project.id}
          project={project}
          index={index}
          activeIndex={activeIndex}
          onOpen={onOpen}
          journey={journey}
          isMobile={isMobile}
          isTablet={isTablet}
        />
      ))}
      <AboutPortal activeIndex={activeIndex} journey={journey} isMobile={isMobile} isTablet={isTablet} />
    </>
  )
}

function ProjectPanel({ project, onClose, onEnter }) {
  const panel = useRef()

  useEffect(() => {
    if (!panel.current) return
    animate(panel.current, {
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 700,
      ease: 'outExpo',
    })
  }, [project])

  return (
    <div className="project-layer" role="dialog" aria-modal="true">
      <button className="close-project" onClick={onClose} aria-label="Close project">
        ×
      </button>
      <article className="project-panel" ref={panel}>
        <div className="project-index">{project.number} / 06</div>
        <div className="project-visual" aria-label={`${project.title} media placeholder`}>
          <div className="project-symbol">{project.symbol}</div>
          <div className="rune-name">{project.runeName}</div>
          <div className="scanline" />
          <span>BEFORE LONG</span>
        </div>
        <div className="project-copy">
          <p className="eyebrow">{project.subtitle}</p>
          <h2>{project.title}</h2>
          <p className="description">{project.description}</p>
          <p className="technology">{project.technology}</p>
          <div className="project-actions">
            <button onClick={onEnter}>ENTER EXPERIMENT</button>
            <button className="ghost">VIEW PROCESS</button>
          </div>
        </div>
      </article>
    </div>
  )
}

function ExperienceHost({ project, onReturn }) {
  const [phase, setPhase] = useState('arriving')
  const [worldMounted, setWorldMounted] = useState(false)
  const returningRef = useRef(false)
  const timersRef = useRef([])

  const schedule = (callback, delay) => {
    const timer = window.setTimeout(callback, delay)
    timersRef.current.push(timer)
    return timer
  }

  const finish = () => {
    if (returningRef.current) return
    returningRef.current = true
    setPhase('returning')

    schedule(() => {
      setWorldMounted(false)
      onReturn()
    }, 900)
  }

  useEffect(() => {
    returningRef.current = false
    setPhase('arriving')
    setWorldMounted(false)

    // The portal reaches full-screen first. During the short blackout the
    // project mounts and measures its final viewport, avoiding stale centers.
    schedule(() => setPhase('blackout'), 1500)
    schedule(() => {
      setWorldMounted(true)
      setPhase('active')
    }, 1850)

    const onKeyDown = (event) => {
      if (event.key === 'Escape') finish()
    }

    window.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id))
      timersRef.current = []
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [project.id])

  return (
    <section className={`experience-host experience-host--${phase}`} aria-label={`${project.title} experience`}>
      <div className="portal-transition" aria-hidden="true">
        <div className="portal-transition__dust" />
        <div className="portal-transition__ring">
          <span className="portal-transition__symbol">{project.symbol}</span>
        </div>
        <div className="portal-transition__copy">
          <span>{project.number}</span>
          <h2>{project.title}</h2>
          <p>{project.subtitle}</p>
        </div>
      </div>

      <div className="project-world">
        {worldMounted && (
          project.id === 'signal' ? (
            <LivingSignal onExit={finish} />
          ) : project.id === 'presence' ? (
            <NegativePresence onExit={finish} />
          ) : (
            <div className="world-placeholder">
              <button onClick={finish}>RETURN</button>
              <span>{project.number}</span>
              <div className="world-placeholder__rune">{project.symbol}</div>
              <h2>{project.title}</h2>
              <p>This chamber is prepared for the original project experience.</p>
            </div>
          )
        )}
      </div>
    </section>
  )
}

function Intro({ started, onStart }) {
  return (
    <div className={`intro ${started ? 'intro--hidden' : ''}`}>
      <p className="intro-kicker">INTERACTIVE ART & DIGITAL EXPERIMENTS</p>
      <h1>CHALK<br />TOWN</h1>
      <p className="intro-note">A JOURNEY THROUGH SIGNAL, MEMORY, MATTER AND DECAY.</p>
      <button className="enter-button" onClick={onStart}>
        <span>ENTER</span>
        <i />
      </button>
      <p className="permission-note">MOVE SLOWLY. SOUND WILL BE INVITED LATER.</p>
    </div>
  )
}

function Navigation({ activeIndex, onSelect, started }) {
  return (
    <aside className={`navigation ${started ? 'navigation--visible' : ''}`}>
      <div className="nav-title">JOURNEY</div>
      {projects.map((project, index) => (
        <button
          key={project.id}
          className={activeIndex === index ? 'active' : ''}
          onClick={() => onSelect(index)}
        >
          <span>{project.number}</span>
          {project.title}
        </button>
      ))}
      <button
        className={activeIndex === projects.length ? 'active' : ''}
        onClick={() => onSelect(projects.length)}
      >
        <span>07</span>About
      </button>
    </aside>
  )
}

export default function App() {
  const deviceMode = useDeviceMode()
  const isMobile = deviceMode === 'mobile'
  const isTablet = deviceMode === 'tablet'
  const isCompact = isMobile || isTablet
  const touchStart = useRef(null)
  const [started, setStarted] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [openedProject, setOpenedProject] = useState(null)
  const [activeExperience, setActiveExperience] = useState(null)
  const journey = useRef(0)
  const targetJourney = useRef(0)

  const goTo = (index) => {
    const nextIndex = clamp(index, 0, projects.length)
    setActiveIndex(nextIndex)
    targetJourney.current = nextIndex === projects.length ? 1 : (nextIndex + 1) / (projects.length + 1)
  }

  useEffect(() => {
    let wheelLocked = false
    const onWheel = (event) => {
      if (!started || openedProject !== null || activeExperience !== null) return
      if (isCompact) {
        if (wheelLocked || Math.abs(event.deltaY) < 12) return
        wheelLocked = true
        goTo(activeIndex + (event.deltaY > 0 ? 1 : -1))
        window.setTimeout(() => { wheelLocked = false }, 420)
        return
      }
      targetJourney.current = clamp(targetJourney.current + event.deltaY * 0.00033, 0, 1)
      const chapter = clamp(
        Math.round(targetJourney.current * (projects.length + 1) - 1),
        0,
        projects.length,
      )
      setActiveIndex(chapter)
    }

    const onKey = (event) => {
      if (!started || openedProject !== null || activeExperience !== null) return
      if (['ArrowDown', 'ArrowRight'].includes(event.key)) goTo(activeIndex + 1)
      if (['ArrowUp', 'ArrowLeft'].includes(event.key)) goTo(activeIndex - 1)
      if (event.key === 'Enter') {
        if (activeIndex < projects.length) setOpenedProject(activeIndex)
      }
    }

    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
    }
  }, [activeIndex, openedProject, activeExperience, started, isCompact])

  const start = () => {
    setStarted(true)
    targetJourney.current = 1 / (projects.length + 1)
  }

  const onTouchStart = (event) => {
    if (!isCompact || !started || openedProject !== null || activeExperience !== null) return
    const touch = event.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
  }

  const onTouchEnd = (event) => {
    if (!isCompact || !touchStart.current || openedProject !== null || activeExperience !== null) return
    const touch = event.changedTouches[0]
    const dx = touch.clientX - touchStart.current.x
    const dy = touch.clientY - touchStart.current.y
    touchStart.current = null
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 45) return
    if (Math.abs(dy) >= Math.abs(dx)) goTo(activeIndex + (dy < 0 ? 1 : -1))
    else goTo(activeIndex + (dx < 0 ? 1 : -1))
  }

  return (
    <main className={`experience experience--${deviceMode}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <Canvas camera={{ position: [0, 0, 4], fov: isMobile ? 42 : isTablet ? 46 : 52 }} dpr={isMobile ? [1, 1.35] : isTablet ? [1, 1.55] : [1, 1.8]}>
        <Scene
          journey={journey}
          targetJourney={targetJourney}
          activeIndex={activeIndex}
          onOpen={setOpenedProject}
          isMobile={isMobile}
          isTablet={isTablet}
        />
      </Canvas>

      <div className={`journey-veil ${started ? 'journey-veil--open' : ''}`} />
      <div className="grain" />
      <div className="vignette" />
      <Intro started={started} onStart={start} />
      <Navigation activeIndex={activeIndex} onSelect={goTo} started={started} />

      <div className={`hud ${started ? 'hud--visible' : ''}`}>
        <span>SCROLL TO TRAVEL</span>
        <div className="hud-line"><i style={{ width: `${((activeIndex + 1) / (projects.length + 1)) * 100}%` }} /></div>
        <span>{String(activeIndex + 1).padStart(2, '0')} / 07</span>
      </div>


      {started && isCompact && (
        <div className="mobile-controls" aria-label="Journey controls">
          <button onClick={() => goTo(activeIndex - 1)} disabled={activeIndex === 0} aria-label="Previous chapter">←</button>
          <div>
            <strong>{String(activeIndex + 1).padStart(2, '0')} / 07</strong>
            <span>{activeIndex < projects.length ? projects[activeIndex].title : 'About'}</span>
          </div>
          <button onClick={() => goTo(activeIndex + 1)} disabled={activeIndex === projects.length} aria-label="Next chapter">→</button>
        </div>
      )}

      <button className={`sound ${started ? 'sound--visible' : ''}`} aria-label="Sound is currently muted">
        SOUND — OFF
      </button>

      {openedProject !== null && (
        <ProjectPanel
          project={projects[openedProject]}
          onClose={() => setOpenedProject(null)}
          onEnter={() => {
            setActiveExperience(openedProject)
            setOpenedProject(null)
          }}
        />
      )}

      {activeExperience !== null && (
        <ExperienceHost
          project={projects[activeExperience]}
          onReturn={() => setActiveExperience(null)}
        />
      )}

    </main>
  )
}
