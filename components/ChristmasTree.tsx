
import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Points, Image, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { COLORS, TREE_CONFIG, ANIMATION_SPEEDS } from '../constants';
import { GalleryImage, HandState, Wish, HandData } from '../types';

const particleVertexShader = `
  uniform float uTime;
  uniform float uInteraction;
  attribute float aSize;
  attribute float aSpeed;
  attribute float aRandom;
  attribute vec3 aColor;
  
  varying vec3 vColor;
  varying float vAlpha;
  
  void main() {
    vColor = aColor;
    vec3 pos = position;
    float breath = sin(uTime * 2.0 + aRandom * 10.0) * 0.05;
    pos += normal * breath;
    pos.y += sin(uTime * aSpeed + aRandom * 100.0) * 0.1;
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    float pulse = 0.8 + 0.4 * sin(uTime * 3.0 + aRandom * 20.0);
    gl_PointSize = aSize * pulse * (250.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
    vAlpha = 0.7 + 0.3 * sin(uTime * 5.0 + aRandom);
  }
`;

const particleFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(gl_PointCoord, center);
    if (dist > 0.5) discard;
    float glow = 1.0 - (dist * 2.0);
    glow = pow(glow, 2.0); 
    gl_FragColor = vec4(vColor, vAlpha * glow);
  }
`;

interface ChristmasTreeProps {
  handState: HandState;
  interactionValue: number;
  wishes: Wish[];
  galleryImages: GalleryImage[];
  activeImageIndex?: number;
  viewedImageId?: string | null;
  selectionLocked: boolean;
  primaryHandPos: HandData;
}

const ChristmasTree: React.FC<ChristmasTreeProps> = ({ 
    handState, 
    interactionValue, 
    wishes, 
    galleryImages,
    activeImageIndex = 0,
    viewedImageId = null,
    selectionLocked = false,
    primaryHandPos
}) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Tree always rotates slowly unless we are inspecting
      const isViewing = !!viewedImageId;
      
      // If viewing, tree fades to back (handled in App logic via interactionValue, here we handle rotation)
      // When viewing, we want the tree stable background? Or slow spin?
      const baseSpeed = isViewing ? 0.01 : TREE_CONFIG.spinSpeed;
      
      // Rotate tree
      groupRef.current.rotation.y += baseSpeed * delta;

      const targetScale = 1 + (interactionValue * TREE_CONFIG.expandMultiplier);
      const targetScaleY = 1 + (interactionValue * 0.2);
      
      groupRef.current.scale.x = THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, ANIMATION_SPEEDS.lerpFactor);
      groupRef.current.scale.z = THREE.MathUtils.lerp(groupRef.current.scale.z, targetScale, ANIMATION_SPEEDS.lerpFactor);
      groupRef.current.scale.y = THREE.MathUtils.lerp(groupRef.current.scale.y, targetScaleY, ANIMATION_SPEEDS.lerpFactor);
    }
  });

  return (
    <group>
        <group ref={groupRef}>
            <TreeParticles interactionValue={interactionValue} />
            <GalaxyRibbon interactionValue={interactionValue} />
            <FluorescentWaves />
            <GemStarTopper />
            <group>
                {wishes.map((wish) => (
                    <WishParticle key={wish.id} position={wish.position} />
                ))}
            </group>
        </group>
        
        <GalleryRing 
            images={galleryImages} 
            interactionValue={interactionValue} 
            activeIndex={activeImageIndex}
            viewedImageId={viewedImageId}
            selectionLocked={selectionLocked}
            primaryHandPos={primaryHandPos}
        />

        <SnowSystem />
    </group>
  );
};

const GalleryRing: React.FC<{ 
    images: GalleryImage[], 
    interactionValue: number, 
    activeIndex: number,
    viewedImageId: string | null,
    selectionLocked: boolean,
    primaryHandPos: HandData
}> = ({ images, interactionValue, activeIndex, viewedImageId, selectionLocked, primaryHandPos }) => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        if (groupRef.current && images.length > 0) {
            // Rotate ring so active item is at angle 0 (closest to camera Z+)
            // Item angle = index * step. We want -ItemAngle + PI/2 to face +Z.
            const step = (Math.PI * 2) / images.length;
            const targetRotationY = -activeIndex * step + (Math.PI / 2); 
            
            let currentY = groupRef.current.rotation.y;
            const diff = (targetRotationY - currentY + Math.PI) % (Math.PI * 2) - Math.PI;
            
            // If viewing, we might detach the ring logic or keep it.
            // Keeping it ensures when we exit view, we are still at the right place.
            // Just don't rotate violently.
            groupRef.current.rotation.y += diff * delta * 5; 
        }
    });

    return (
        <group ref={groupRef}>
             {images.map((img, idx) => (
                <FloatingImage 
                    key={img.id} 
                    url={img.url} 
                    index={idx} 
                    total={images.length} 
                    interactionValue={interactionValue}
                    isActive={idx === activeIndex}
                    isViewed={img.id === viewedImageId}
                    selectionLocked={selectionLocked}
                    primaryHandPos={primaryHandPos}
                />
            ))}
        </group>
    )
}

const FloatingImage: React.FC<{ 
    url: string, 
    index: number, 
    total: number, 
    interactionValue: number,
    isActive: boolean,
    isViewed: boolean,
    selectionLocked: boolean,
    primaryHandPos: HandData
}> = ({ url, index, total, interactionValue, isActive, isViewed, selectionLocked, primaryHandPos }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const { camera } = useThree();
    
    const angle = (index / total) * Math.PI * 2;
    const radiusBase = 7.5; 

    useFrame((state, delta) => {
        if (meshRef.current) {
            
            if (isViewed) {
                // --- INSPECTION MODE ---
                // Mirror Movement based on hand coordinates
                // Hand X 0..1 -> World X -10..10
                // Invert X because camera mirrors user
                const handX = (1 - primaryHandPos.x) * 20 - 10; 
                // Hand Y 0..1 -> World Y -2..8
                const handY = (1 - primaryHandPos.y) * 10 - 2; 

                const targetPos = new THREE.Vector3(handX, handY, 13); // Close to camera (18)
                
                // Zoom Logic based on Hand State
                const isZoomed = primaryHandPos.state === HandState.OPEN_PALM;
                const targetScale = isZoomed ? 16 : 10;
                
                // Lerp position
                meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetPos.x, delta * 8);
                meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetPos.y, delta * 8);
                meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, targetPos.z, delta * 8);
                
                // Lerp scale
                const s = THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, delta * 5);
                meshRef.current.scale.set(s, s, s);
                
                meshRef.current.lookAt(camera.position);

            } else {
                // --- BROWSING MODE ---
                const t = state.clock.getElapsedTime();
                const currentRadius = radiusBase + (interactionValue * 2);
                
                const x = Math.cos(angle) * currentRadius;
                const z = Math.sin(angle) * currentRadius;
                
                // Bobbing unless selected
                let y = 0;
                if (isActive && selectionLocked) {
                    y = 0; 
                } else {
                    y = Math.sin(t + index) * 1.5; 
                }
                
                meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, x, delta * 3);
                meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, z, delta * 3);
                meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, y, delta * 3);
                
                // Scale highlight
                const targetScale = (isActive && selectionLocked) ? 3.5 : (isActive ? 2.5 : 1.5);
                const s = THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, delta * 5);
                meshRef.current.scale.set(s, s, s);
                
                meshRef.current.lookAt(camera.position);
            }
        }
    });

    return (
        <group>
            <mesh ref={meshRef}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial transparent opacity={0} /> {/* Invisible Anchor */}
                
                <Image 
                    url={url}
                    transparent
                    opacity={isViewed ? 1 : (isActive ? 1 : 0.6)}
                    scale={[1, 1]} 
                />
                
                {/* Gold Selection Frame */}
                {(isActive && selectionLocked && !isViewed) && (
                    <mesh position={[0, 0, -0.05]}>
                        <planeGeometry args={[1.1, 1.1]} />
                        <meshBasicMaterial color="#FFD700" toneMapped={false} />
                    </mesh>
                )}
            </mesh>
        </group>
    )
}

// ... Reusing other components unchanged ...
const TreeParticles: React.FC<{ interactionValue: number }> = ({ interactionValue }) => {
    const shaderRef = useRef<THREE.ShaderMaterial>(null);
    const geometryRef = useRef<THREE.BufferGeometry>(null);

    const { positions, colors, sizes, speeds, randoms } = useMemo(() => {
        const count = TREE_CONFIG.particleCount;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const speeds = new Float32Array(count);
        const randoms = new Float32Array(count);
    
        const colorCore = new THREE.Color(COLORS.particles.core);
        const colorOuter = new THREE.Color(COLORS.particles.outer);
        const colorEdge = new THREE.Color(COLORS.particles.edge);
    
        for (let i = 0; i < count; i++) {
            const y = (Math.random() - 0.5) * TREE_CONFIG.height; 
            const normalizedY = (y + TREE_CONFIG.height / 2) / TREE_CONFIG.height; 
            const maxRadius = TREE_CONFIG.radius * (1 - normalizedY);
            
            const r = Math.pow(Math.random(), 0.6) * maxRadius; 
            const theta = Math.random() * Math.PI * 2;
        
            positions[i * 3] = r * Math.cos(theta);
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = r * Math.sin(theta);
        
            const distRatio = r / maxRadius;
            const mixedColor = new THREE.Color().copy(colorCore);
            if (distRatio > 0.4) mixedColor.lerp(colorOuter, (distRatio - 0.4) * 1.5);
            if (distRatio > 0.8) mixedColor.lerp(colorEdge, (distRatio - 0.8) * 3.0);

            colors[i * 3] = mixedColor.r;
            colors[i * 3 + 1] = mixedColor.g;
            colors[i * 3 + 2] = mixedColor.b;
        
            sizes[i] = Math.random() * 0.5 + 0.2;
            speeds[i] = Math.random();
            randoms[i] = Math.random();
        }

        return { positions, colors, sizes, speeds, randoms };
    }, []);

    useFrame((state) => {
        if (shaderRef.current) {
            shaderRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
            shaderRef.current.uniforms.uInteraction.value = interactionValue;
        }
    });

    return (
        <points>
            <bufferGeometry ref={geometryRef}>
                <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
                <bufferAttribute attach="attributes-aColor" count={colors.length / 3} array={colors} itemSize={3} />
                <bufferAttribute attach="attributes-aSize" count={sizes.length} array={sizes} itemSize={1} />
                <bufferAttribute attach="attributes-aSpeed" count={speeds.length} array={speeds} itemSize={1} />
                <bufferAttribute attach="attributes-aRandom" count={randoms.length} array={randoms} itemSize={1} />
            </bufferGeometry>
            <shaderMaterial 
                ref={shaderRef}
                vertexShader={particleVertexShader}
                fragmentShader={particleFragmentShader}
                uniforms={{
                    uTime: { value: 0 },
                    uInteraction: { value: 0 }
                }}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
};

const GalaxyRibbon: React.FC<{ interactionValue: number }> = ({ interactionValue }) => {
    const ref = useRef<THREE.Points>(null);
    const count = 1200; 

    const { positions, colors, sizes } = useMemo(() => {
        const p = new Float32Array(count * 3);
        const c = new Float32Array(count * 3);
        const s = new Float32Array(count);
        
        const turns = 4.0;
        const height = TREE_CONFIG.height + 2; 

        const c1 = new THREE.Color(COLORS.particles.ribbon);
        const c2 = new THREE.Color(COLORS.particles.silver);
        const c3 = new THREE.Color('#FFFFFF');

        for (let i = 0; i < count; i++) {
            const t = i / count; 
            const angle = t * Math.PI * 2 * turns;
            
            const y = (1 - t) * height - (height / 2);
            const normalizedY = (y + height / 2) / height;
            const radiusBase = (TREE_CONFIG.radius * (1 - normalizedY)) + 0.5; 

            const spread = (Math.random() - 0.5) * (1.5 * (1 - normalizedY) + 0.2);
            
            const rFinal = radiusBase + spread;
            const angleFinal = angle + (Math.random() - 0.5) * 0.2; 

            p[i*3] = Math.cos(angleFinal) * rFinal;
            p[i*3+1] = y + (Math.random() - 0.5) * 0.3; 
            p[i*3+2] = Math.sin(angleFinal) * rFinal;
            
            const col = Math.random() > 0.7 ? c3 : (Math.random() > 0.5 ? c2 : c1);
            c[i*3] = col.r;
            c[i*3+1] = col.g;
            c[i*3+2] = col.b;

            s[i] = Math.random() * 0.15 + 0.05;
        }
        return { positions: p, colors: c, sizes: s };
    }, []);

    useFrame((state) => {
        if (!ref.current) return;
        const time = state.clock.getElapsedTime();
    });

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
                <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
                <bufferAttribute attach="attributes-size" count={count} array={sizes} itemSize={1} />
            </bufferGeometry>
            <pointsMaterial 
                vertexColors
                transparent
                opacity={0.6}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                sizeAttenuation
                size={0.15}
            />
        </points>
    );
};

const FluorescentWaves: React.FC = () => {
    const ref = useRef<THREE.Points>(null);
    const count = 3000; 
    
    const { initialPositions, colors, randoms } = useMemo(() => {
        const p = new Float32Array(count * 3);
        const c = new Float32Array(count * 3);
        const r = new Float32Array(count);
        
        const maxRadius = TREE_CONFIG.radius * 2.0; 
        
        const cBlue = new THREE.Color(COLORS.particles.core);
        const cCyan = new THREE.Color(COLORS.particles.diamond);
        const cFluo = new THREE.Color("#00FFFF");

        for(let i=0; i<count; i++) {
            const radius = Math.sqrt(Math.random()) * maxRadius;
            const theta = Math.random() * Math.PI * 2;
            
            p[i*3] = radius * Math.cos(theta);
            p[i*3+1] = 0; 
            p[i*3+2] = radius * Math.sin(theta);
            
            r[i] = Math.random(); 

            const ratio = radius / maxRadius;
            const col = new THREE.Color().copy(cBlue);
            if (ratio > 0.3) col.lerp(cCyan, 0.5);
            if (ratio > 0.7) col.lerp(cFluo, 0.5);
            
            c[i*3] = col.r;
            c[i*3+1] = col.g;
            c[i*3+2] = col.b;
        }
        return { initialPositions: p, colors: c, randoms: r };
    }, []);

    useFrame((state) => {
        if (!ref.current) return;
        const t = state.clock.getElapsedTime();
        const positions = ref.current.geometry.attributes.position.array as Float32Array;
        
        for(let i=0; i<count; i++) {
             const ix = i * 3;
             const x = initialPositions[ix];
             const z = initialPositions[ix + 2];
             
             const dist = Math.sqrt(x*x + z*z);
             const wave1 = Math.sin(dist * 0.8 - t * 2.0);
             const wave2 = Math.sin(x * 0.5 + t * 1.0) * Math.cos(z * 0.3 + t * 0.5);
             const height = (wave1 * 0.2 + wave2 * 0.3) * (dist / 10.0); 
             
             positions[ix + 1] = -TREE_CONFIG.height / 2 + height - 1.0; 
             positions[ix] = x;
             positions[ix+2] = z;
        }
        ref.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={initialPositions} itemSize={3} />
                <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial 
                vertexColors
                size={0.15} 
                transparent 
                blending={THREE.AdditiveBlending}
                opacity={0.5}
                depthWrite={false}
            />
        </points>
    );
}

const GemStarTopper: React.FC = () => {
    const ref = useRef<THREE.Group>(null);
    
    useFrame((state) => {
        if (ref.current) {
            const t = state.clock.elapsedTime;
            ref.current.rotation.y = t * 0.3;
            ref.current.position.y = (TREE_CONFIG.height / 2 + 0.6) + Math.sin(t * 1.5) * 0.1;
        }
    });

    return (
        <group ref={ref} position={[0, TREE_CONFIG.height / 2 + 0.6, 0]}>
            <mesh>
                <octahedronGeometry args={[0.7, 0]} />
                <meshPhysicalMaterial 
                    color="#E0FFFF" 
                    emissive="#E0FFFF"
                    emissiveIntensity={1.5}
                    roughness={0} 
                    metalness={0.9} 
                    transparent
                    opacity={0.9}
                    clearcoat={1}
                />
            </mesh>
            <mesh rotation={[0, Math.PI / 4, 0]} scale={[0.6, 0.6, 0.6]}>
                <octahedronGeometry args={[0.7, 0]} />
                <meshBasicMaterial 
                    color="#FFFFFF" 
                    wireframe
                    transparent
                    opacity={0.3}
                />
            </mesh>
            <pointLight color="#FFFFFF" intensity={2} distance={10} decay={2} />
            <Sparkles count={10} scale={1.5} size={3} speed={0.2} opacity={0.8} color="#FFF" />
        </group>
    );
};

const SnowSystem: React.FC = () => {
    const count = 1500;
    const mesh = useRef<THREE.Points>(null);
    
    const { pos, speeds, colors } = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const speeds = new Float32Array(count);
        const colors = new Float32Array(count * 3);
        
        const white = new THREE.Color(COLORS.particles.snow);
        const blue = new THREE.Color(COLORS.particles.diamond); 

        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 40;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 40;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
            speeds[i] = 0.05 + Math.random() * 0.15;
            
            const c = Math.random() > 0.5 ? blue : white;
            colors[i * 3] = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
        }
        return { pos, speeds, colors };
    }, []);

    useFrame(() => {
        if (!mesh.current) return;
        const positions = mesh.current.geometry.attributes.position.array as Float32Array;
        
        for (let i = 0; i < count; i++) {
            positions[i * 3 + 1] -= speeds[i];
            if (positions[i * 3 + 1] < -20) {
                positions[i * 3 + 1] = 20;
                positions[i * 3] = (Math.random() - 0.5) * 40;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
            }
        }
        mesh.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <points ref={mesh}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={pos} itemSize={3} />
                <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial 
                size={0.15} 
                transparent 
                vertexColors 
                opacity={0.8} 
                blending={THREE.AdditiveBlending} 
                depthWrite={false}
            />
        </points>
    );
};

const WishParticle: React.FC<{ position: [number, number, number] }> = ({ position }) => {
    const ref = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        if (ref.current) {
             ref.current.position.y += delta * 2;
             ref.current.rotation.y += delta * 2;
             const angle = state.clock.elapsedTime + ref.current.position.y;
             ref.current.position.x = Math.sin(angle) * 1.5;
             ref.current.position.z = Math.cos(angle) * 1.5;

             if (ref.current.position.y > 10) ref.current.position.y = -6;
        }
    });

    return (
        <group ref={ref} position={[0, -5, 0]}>
             <mesh>
                 <sphereGeometry args={[0.08, 8, 8]} />
                 <meshBasicMaterial color={COLORS.particles.gold} />
             </mesh>
             <pointLight color={COLORS.particles.gold} distance={3} intensity={2} />
             <Sparkles count={5} scale={0.5} color={COLORS.particles.gold}/>
        </group>
    )
}

export default ChristmasTree;
