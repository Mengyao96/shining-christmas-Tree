
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing';
import ChristmasTree from './ChristmasTree';
import { HandState, GalleryImage, HandData } from '../types';
import { COLORS } from '../constants';

interface SceneProps {
  handState: HandState;
  interactionValue: number;
  wishes: any[];
  galleryImages: GalleryImage[];
  activeImageIndex: number;
  viewedImageId: string | null;
  selectionLocked: boolean;
  primaryHandPos: HandData;
}

const Scene: React.FC<SceneProps> = (props) => {
  return (
    <div className="w-full h-screen absolute top-0 left-0 z-0">
      <Canvas 
        camera={{ position: [0, 2, 18], fov: 45 }} 
        dpr={[1, 2]} 
        gl={{ antialias: false, alpha: false, stencil: false, depth: true }}
      >
        <color attach="background" args={[COLORS.background]} />
        
        <ambientLight intensity={0.4} color="#002244" />
        <spotLight position={[15, 20, 15]} angle={0.5} penumbra={1} intensity={3} color="#E0FFFF" distance={60} />
        <spotLight position={[-15, 5, -10]} angle={0.4} penumbra={0.5} intensity={2.5} color="#00BFFF" distance={60} />
        <pointLight position={[0, -8, 0]} intensity={2} color="#00FFFF" distance={25} />

        <Suspense fallback={null}>
          <ChristmasTree {...props} />
          
          <ContactShadows 
            resolution={1024} 
            scale={60} 
            blur={3} 
            opacity={0.6} 
            far={20} 
            color="#001133" 
            position={[0, -7.5, 0]}
          />
        </Suspense>

        <OrbitControls 
            enablePan={false} 
            minPolarAngle={Math.PI / 3} 
            maxPolarAngle={Math.PI / 1.8}
            minDistance={10}
            maxDistance={30}
            autoRotate={!props.viewedImageId && !props.selectionLocked && props.interactionValue < 0.1} 
            autoRotateSpeed={0.4}
            enabled={!props.viewedImageId} 
        />

        <EffectComposer enableNormalPass={false}>
          <Bloom 
            luminanceThreshold={0.2} 
            mipmapBlur 
            intensity={2.0} 
            radius={0.6}
            levels={9}
          />
          <Vignette eskil={false} offset={0.1} darkness={1.0} />
          <ToneMapping />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

export default Scene;
