"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { toStoragePathname } from "@/lib/asset-url";

export interface ModelViewerProps {
  url: string;
  mtlUrl?: string;
  previewImage?: string;
  title?: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  defaultRotationX?: number; // degrees
  defaultRotationY?: number; // degrees
  defaultZoom?: number;
  minZoomDistance?: number;
  maxZoomDistance?: number;
  enableMouseParallax?: boolean;
  enableManualRotation?: boolean;
  enableHoverRotation?: boolean;
  enableManualZoom?: boolean;
  ambientIntensity?: number;
  keyLightIntensity?: number;
  fillLightIntensity?: number;
  rimLightIntensity?: number;
  autoFrame?: boolean;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  showScreenshotButton?: boolean;
  showControls?: boolean;
  /** Whether 3D WebGL context is initialized only upon user click/tap */
  interactiveOnlyOnClick?: boolean;
  onModelLoaded?: () => void;
}

export default function ModelViewer({
  url,
  mtlUrl,
  previewImage,
  title = "3D CAD Model",
  className = "",
  width = "100%",
  height = 420,
  defaultRotationX = -35,
  defaultRotationY = 25,
  defaultZoom = 2.2,
  minZoomDistance = 0.8,
  maxZoomDistance = 8.0,
  enableMouseParallax = true,
  enableManualRotation = true,
  enableHoverRotation = true,
  enableManualZoom = true,
  ambientIntensity = 0.7,
  keyLightIntensity = 1.4,
  fillLightIntensity = 0.8,
  rimLightIntensity = 1.1,
  autoFrame = true,
  autoRotate: initialAutoRotate = false,
  autoRotateSpeed = 0.8,
  showScreenshotButton = true,
  showControls = true,
  interactiveOnlyOnClick = true,
  onModelLoaded,
}: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Lazy initiation state: only loads WebGL and assets when tapped/clicked
  const [isInitiated, setIsInitiated] = useState(!interactiveOnlyOnClick);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [autoRotateActive, setAutoRotateActive] = useState(initialAutoRotate);
  const [wireframeMode, setWireframeMode] = useState(false);

  // References for Three.js lifecycle
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const materialsRef = useRef<THREE.Material[]>([]);

  // Parallax tracking
  const mouseParallaxRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  const handleInitiate = useCallback(() => {
    if (!isInitiated) {
      setIsInitiated(true);
      setLoading(true);
      setErrorMessage(null);
    }
  }, [isInitiated]);

  const handleResetCamera = useCallback(() => {
    if (!controlsRef.current || !cameraRef.current) return;
    const radX = (defaultRotationX * Math.PI) / 180;
    const radY = (defaultRotationY * Math.PI) / 180;
    const dist = defaultZoom;

    const x = dist * Math.cos(radX) * Math.sin(radY);
    const y = dist * Math.sin(-radX);
    const z = dist * Math.cos(radX) * Math.cos(radY);

    cameraRef.current.position.set(x, y, z);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  }, [defaultRotationX, defaultRotationY, defaultZoom]);

  const handleToggleAutoRotate = useCallback(() => {
    setAutoRotateActive((prev) => {
      const next = !prev;
      if (controlsRef.current) {
        controlsRef.current.autoRotate = next;
      }
      return next;
    });
  }, []);

  const handleToggleWireframe = useCallback(() => {
    setWireframeMode((prev) => {
      const next = !prev;
      materialsRef.current.forEach((mat) => {
        if ("wireframe" in mat) {
          (mat as THREE.MeshStandardMaterial).wireframe = next;
        }
      });
      return next;
    });
  }, []);

  const handleScreenshot = useCallback(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return;

    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL("image/png");
    const a = document.createElement("a");
    const sanitizedTitle = (title || "model").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    a.download = `${sanitizedTitle}-3d.png`;
    a.href = dataUrl;
    a.click();
  }, [title]);

  const handleSleep = useCallback(() => {
    setIsInitiated(false);
    setLoading(false);
  }, []);

  // Initialize Three.js scene once initiated
  useEffect(() => {
    if (!isInitiated) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    setLoading(true);
    setErrorMessage(null);
    setLoadingProgress(10);

    const widthPx = container.clientWidth || 400;
    const heightPx = container.clientHeight || 420;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, widthPx / heightPx, 0.05, 100);
    cameraRef.current = camera;

    // Initial camera position
    const radX = (defaultRotationX * Math.PI) / 180;
    const radY = (defaultRotationY * Math.PI) / 180;
    const dist = defaultZoom;
    camera.position.set(
      dist * Math.cos(radX) * Math.sin(radY),
      dist * Math.sin(-radX),
      dist * Math.cos(radX) * Math.cos(radY)
    );

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    rendererRef.current = renderer;
    renderer.setSize(widthPx, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableRotate = enableManualRotation;
    controls.enableZoom = enableManualZoom;
    controls.minDistance = minZoomDistance;
    controls.maxDistance = maxZoomDistance;
    controls.autoRotate = autoRotateActive;
    controls.autoRotateSpeed = autoRotateSpeed * 2.0;
    controls.target.set(0, 0, 0);

    // 5. Lighting Setup (ReactBits 3-point preset)
    const ambientLight = new THREE.AmbientLight(0xdff0ff, ambientIntensity);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, keyLightIntensity);
    keyLight.position.set(5, 7, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x73a5ff, fillLightIntensity);
    fillLight.position.set(-5, 3, 3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff3355, rimLightIntensity);
    rimLight.position.set(0, 5, -6);
    scene.add(rimLight);

    // Subtle Sci-Fi Grid Plane & Ground Shadow
    const gridHelper = new THREE.GridHelper(4, 20, 0xef4444, 0x1f2937);
    gridHelper.position.y = -0.52;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.22;
    scene.add(gridHelper);

    // Contact shadow plane
    const shadowGeo = new THREE.PlaneGeometry(3.5, 3.5);
    const canvasShadow = document.createElement("canvas");
    canvasShadow.width = 128;
    canvasShadow.height = 128;
    const ctx = canvasShadow.getContext("2d");
    if (ctx) {
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, "rgba(0, 0, 0, 0.75)");
      grad.addColorStop(0.4, "rgba(0, 0, 0, 0.45)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
    }
    const shadowTexture = new THREE.CanvasTexture(canvasShadow);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.519;
    scene.add(shadowPlane);

    // 6. Model Loader (OBJ / MTL / GLTF)
    const storagePath = toStoragePathname(url);
    const ext = storagePath.split(".").pop()?.toLowerCase();
    const modelGroup = new THREE.Group();
    modelGroupRef.current = modelGroup;
    scene.add(modelGroup);

    materialsRef.current = [];

    const applyMaterialStyling = (obj: THREE.Object3D) => {
      obj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          // Convert materials to high-grade PBR Standard Material if needed
          const processMat = (mat: THREE.Material) => {
            materialsRef.current.push(mat);
            if ("wireframe" in mat) {
              (mat as THREE.MeshStandardMaterial).wireframe = wireframeMode;
            }

            // Enhance CAD materials
            const name = mat.name || "";
            let color = "color" in mat && mat.color ? (mat.color as THREE.Color).clone() : new THREE.Color(0xd0d7de);
            let metalness = 0.5;
            let roughness = 0.4;
            let matched = false;

            // Parse Autodesk ATF format: Opaque(r,g,b)
            const opaqueMatch = name.match(/Opaque\((\d+),(\d+),(\d+)\)/);
            if (opaqueMatch) {
              const r = parseInt(opaqueMatch[1], 10) / 255;
              const g = parseInt(opaqueMatch[2], 10) / 255;
              const b = parseInt(opaqueMatch[3], 10) / 255;
              color = new THREE.Color(r, g, b);
              metalness = 0.6;
              roughness = 0.35;
              matched = true;
            } else if (/steel/i.test(name)) {
              color = new THREE.Color(0xb0b8c0);
              metalness = 0.85;
              roughness = 0.25;
              matched = true;
            } else if (/aluminum|aluminium/i.test(name)) {
              color = /blue/i.test(name) ? new THREE.Color(0x2563eb) : new THREE.Color(0xcfd8dc);
              metalness = 0.8;
              roughness = 0.3;
              matched = true;
            } else if (/gold/i.test(name)) {
              color = new THREE.Color(0xd4af37);
              metalness = 0.9;
              roughness = 0.25;
              matched = true;
            }

            if (mat instanceof THREE.MeshStandardMaterial) {
              if (matched) {
                mat.color = color;
                mat.metalness = metalness;
                mat.roughness = roughness;
                mat.needsUpdate = true;
              }
              return mat;
            }

            if (mat instanceof THREE.MeshPhongMaterial || mat instanceof THREE.MeshBasicMaterial) {
              const standardMat = new THREE.MeshStandardMaterial({
                name: mat.name,
                color,
                metalness,
                roughness,
                wireframe: wireframeMode,
              });
              materialsRef.current.push(standardMat);
              return standardMat;
            }
            return mat;
          };

          if (Array.isArray(mesh.material)) {
            mesh.material = mesh.material.map(processMat);
          } else if (mesh.material) {
            mesh.material = processMat(mesh.material);
          }
        }
      });
    };

    const fitModelToFrame = (object: THREE.Object3D) => {
      object.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(object);
      const sphere = box.getBoundingSphere(new THREE.Sphere());

      if (sphere.radius === 0) return;

      // Scale model uniformly to fit within normalized 1.0 unit diameter
      const scale = 1 / (sphere.radius * 2);
      object.scale.setScalar(scale);

      // Center model at origin
      object.position.set(-sphere.center.x * scale, -sphere.center.y * scale, -sphere.center.z * scale);

      // Re-adjust ground plane height slightly below model bottom
      const updatedBox = new THREE.Box3().setFromObject(object);
      const bottomY = updatedBox.min.y;
      gridHelper.position.y = bottomY - 0.01;
      shadowPlane.position.y = bottomY - 0.009;

      if (autoFrame) {
        controls.target.set(0, 0, 0);
        controls.update();
      }
    };

    const loadObj = (materialsCreator?: MTLLoader.MaterialCreator) => {
      const objLoader = new OBJLoader();
      if (materialsCreator) {
        materialsCreator.preload();
        objLoader.setMaterials(materialsCreator);
      }

      objLoader.load(
        url,
        (obj) => {
          applyMaterialStyling(obj);
          modelGroup.add(obj);
          fitModelToFrame(modelGroup);
          setLoading(false);
          setLoadingProgress(100);
          onModelLoaded?.();
        },
        (xhr) => {
          if (xhr.lengthComputable && xhr.total > 0) {
            const percent = Math.min(Math.round((xhr.loaded / xhr.total) * 100), 99);
            setLoadingProgress(percent);
          }
        },
        (error) => {
          console.error("Error loading OBJ model:", error);
          setErrorMessage("Failed to load 3D OBJ model");
          setLoading(false);
        }
      );
    };

    if (ext === "glb" || ext === "gltf") {
      const gltfLoader = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
      gltfLoader.setDRACOLoader(dracoLoader);
      gltfLoader.load(
        url,
        (gltf) => {
          applyMaterialStyling(gltf.scene);
          modelGroup.add(gltf.scene);
          fitModelToFrame(modelGroup);
          setLoading(false);
          setLoadingProgress(100);
          onModelLoaded?.();
        },
        (xhr) => {
          if (xhr.lengthComputable && xhr.total > 0) {
            setLoadingProgress(Math.min(Math.round((xhr.loaded / xhr.total) * 100), 99));
          }
        },
        (err) => {
          console.error("Error loading GLTF:", err);
          setErrorMessage("Failed to load GLTF model");
          setLoading(false);
        }
      );
    } else {
      // OBJ file
      if (mtlUrl) {
        const mtlLoader = new MTLLoader();
        mtlLoader.load(
          mtlUrl,
          (materialsCreator) => {
            loadObj(materialsCreator);
          },
          undefined,
          (err) => {
            console.warn("MTL load failed, falling back to default shaders:", err);
            loadObj();
          }
        );
      } else {
        loadObj();
      }
    }

    // 7. Mouse Parallax event listeners (ReactBits feature)
    const handleMouseMove = (e: MouseEvent) => {
      if (!enableMouseParallax) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      mouseParallaxRef.current.targetX = x * 0.15;
      mouseParallaxRef.current.targetY = y * 0.15;
    };

    const handleMouseLeave = () => {
      mouseParallaxRef.current.targetX = 0;
      mouseParallaxRef.current.targetY = 0;
    };

    if (enableMouseParallax) {
      container.addEventListener("mousemove", handleMouseMove);
      container.addEventListener("mouseleave", handleMouseLeave);
    }

    // 8. Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // 9. Animation Loop
    let running = true;
    const animate = () => {
      if (!running) return;
      animFrameIdRef.current = requestAnimationFrame(animate);

      // Smooth parallax easing
      if (enableMouseParallax && modelGroupRef.current) {
        const p = mouseParallaxRef.current;
        p.x += (p.targetX - p.x) * 0.08;
        p.y += (p.targetY - p.y) * 0.08;
        modelGroupRef.current.rotation.y += p.x * 0.02;
        modelGroupRef.current.rotation.x = p.y * 0.05;
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // 10. Cleanup
    return () => {
      running = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener("resize", handleResize);
      if (enableMouseParallax) {
        container.removeEventListener("mousemove", handleMouseMove);
        container.removeEventListener("mouseleave", handleMouseLeave);
      }

      controls.dispose();

      // Dispose geometries & materials
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else if (mesh.material) {
            mesh.material.dispose();
          }
        }
      });

      renderer.dispose();
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
    };
  }, [
    isInitiated,
    url,
    mtlUrl,
    ambientIntensity,
    keyLightIntensity,
    fillLightIntensity,
    rimLightIntensity,
    defaultRotationX,
    defaultRotationY,
    defaultZoom,
    minZoomDistance,
    maxZoomDistance,
    enableManualRotation,
    enableManualZoom,
    enableMouseParallax,
    autoFrame,
    autoRotateActive,
    autoRotateSpeed,
    onModelLoaded,
  ]);

  return (
    <div
      ref={containerRef}
      className={`group relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#12121e]/90 to-[#08080f]/95 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)] select-none transition-all duration-300 hover:border-red-500/40 ${className}`}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
      }}
    >
      {/* ── UNINITIATED STATE (STATIC PREVIEW IMAGE WITH TAP/CLICK TO INITIATE 3D) ── */}
      {!isInitiated && (
        <div
          onClick={handleInitiate}
          className="absolute inset-0 z-20 flex flex-col justify-between p-5 cursor-pointer overflow-hidden transition-all group/preview"
        >
          {/* Static Preview Image Background */}
          {previewImage ? (
            <img
              src={previewImage}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover/preview:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#0e0e18] via-[#080810] to-black">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ef4444_1px,transparent_1px)] [background-size:18px_18px]" />
            </div>
          )}

          {/* Vignette Overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/40 transition-opacity group-hover/preview:opacity-85" />

          {/* Top Bar with Format & Interactive Badge */}
          <div className="relative z-10 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest bg-black/60 backdrop-blur-md text-red-300 border border-red-500/40 shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              3D CAD Model
            </span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider bg-black/60 backdrop-blur-md text-slate-300 border border-white/15">
              {url.split(".").pop()?.toUpperCase() || "OBJ"}
            </span>
          </div>

          {/* Center / Bottom Launch Prompt */}
          <div className="relative z-10 flex flex-col items-center text-center mt-auto">
            <button
              type="button"
              className="px-6 py-2.5 rounded-2xl text-xs font-mono uppercase tracking-wider font-bold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 border border-red-400/40 shadow-[0_8px_30px_rgba(239,68,68,0.55)] backdrop-blur-md transition-all duration-300 group-hover/preview:scale-105 flex items-center gap-2.5"
            >
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              <span>Launch 3D View</span>
              <span className="text-red-200">→</span>
            </button>
            <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest mt-2">
              Tap anywhere to orbit in 3D
            </span>
          </div>
        </div>
      )}

      {/* ── LOADING OVERLAY ─────────────────────────────────────────────────── */}
      {isInitiated && loading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm">
          <div className="relative w-12 h-12 mb-3">
            <div className="w-12 h-12 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] text-red-400 font-bold">
              {loadingProgress}%
            </div>
          </div>
          <p className="font-mono text-xs text-slate-300 tracking-wider uppercase mb-1">
            Rendering CAD Geometry…
          </p>
          <div className="w-36 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-200"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* ── ERROR DISPLAY ───────────────────────────────────────────────────── */}
      {errorMessage && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 p-6 text-center">
          <span className="text-red-400 text-2xl mb-2">⚠</span>
          <p className="text-red-300 text-sm font-mono mb-3">{errorMessage}</p>
          <button
            onClick={handleInitiate}
            className="px-3 py-1.5 rounded-lg text-xs font-mono bg-red-600/80 hover:bg-red-500 text-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── ACTIVE THREE.JS CANVAS ──────────────────────────────────────────── */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full block cursor-grab active:cursor-grabbing transition-opacity duration-500 ${
          isInitiated && !loading ? "opacity-100" : "opacity-0"
        }`}
        style={{ touchAction: "none" }}
      />

      {/* ── CONTROLS TOOLBAR (TOP RIGHT & BOTTOM) ───────────────────────────── */}
      {isInitiated && !loading && showControls && (
        <>
          {/* Top-Right Controls */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-lg">
            {/* Wireframe toggle */}
            <button
              onClick={handleToggleWireframe}
              title={wireframeMode ? "Shaded View" : "Wireframe CAD View"}
              className={`p-2 rounded-lg text-xs font-mono transition-colors ${
                wireframeMode
                  ? "bg-red-600 text-white"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="3 3" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="3" />
              </svg>
            </button>

            {/* Auto Rotate toggle */}
            <button
              onClick={handleToggleAutoRotate}
              title={autoRotateActive ? "Pause Auto-Rotation" : "Enable Auto-Rotation"}
              className={`p-2 rounded-lg text-xs font-mono transition-colors ${
                autoRotateActive
                  ? "bg-red-600 text-white"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>

            {/* Reset Camera */}
            <button
              onClick={handleResetCamera}
              title="Reset View Angle"
              className="p-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>

            {/* Take Screenshot (ReactBits Feature) */}
            {showScreenshotButton && (
              <button
                onClick={handleScreenshot}
                title="Capture Screenshot (PNG)"
                className="p-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </button>
            )}

            {/* Sleep / Unload 3D View to save GPU */}
            {interactiveOnlyOnClick && (
              <button
                onClick={handleSleep}
                title="Sleep 3D View (Save GPU)"
                className="p-2 rounded-lg text-xs text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Bottom Interaction Hint */}
          <div className="absolute bottom-3 left-3 pointer-events-none z-10 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-300">
              Drag to Orbit • Scroll to Zoom
            </span>
          </div>
        </>
      )}
    </div>
  );
}
