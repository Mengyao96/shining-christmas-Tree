
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Scene from './components/Scene';
import Interface from './components/Interface';
import HandTracker from './components/HandTracker';
import { HandState, Wish, GalleryImage, HandData } from './types';
import { ANIMATION_SPEEDS } from './constants';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
  const [handCount, setHandCount] = useState(0);
  const [primaryHand, setPrimaryHand] = useState<HandData>({ state: HandState.IDLE, x: 0.5, y: 0.5 });
  const [secondaryHand, setSecondaryHand] = useState<HandData>({ state: HandState.IDLE, x: 0.5, y: 0.5 });
  
  const [interactionValue, setInteractionValue] = useState(0); 
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  
  // Gallery Navigation State
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [viewedImageId, setViewedImageId] = useState<string | null>(null);
  const [selectionLocked, setSelectionLocked] = useState(false);

  // Logic Refs
  const lastInteractionTimeRef = useRef(Date.now());
  const prevPrimaryPosRef = useRef({ x: 0.5, y: 0.5 });
  const autoRotationTimerRef = useRef<number | null>(null);

  // --- HAND DATA HANDLER ---
  const handleHandUpdate = useCallback((count: number, prim: HandData, sec: HandData) => {
      setHandCount(count);
      setPrimaryHand(prim);
      setSecondaryHand(sec);
  }, []);

  // --- LOGIC: Tree Expansion (Browsing Mode) ---
  useEffect(() => {
    let target = 0;
    
    // In Inspection Mode (Viewing), we force tree slightly open/background
    if (viewedImageId) {
        target = 0.5; 
    } else {
        // Browsing Mode: Map Hand Y to Tree Expansion
        // Y is 0 (top) to 1 (bottom).
        // High hand (small Y) -> Expand Tree (Value 1)
        // Low hand (large Y) -> Contract Tree (Value 0)
        if (handCount > 0) {
            target = Math.max(0, Math.min(1, 1 - primaryHand.y));
        } else {
            target = 0;
        }
    }

    const interval = setInterval(() => {
      setInteractionValue(prev => {
        const diff = target - prev;
        if (Math.abs(diff) < 0.01) return target;
        return prev + diff * ANIMATION_SPEEDS.lerpFactor;
      });
    }, 16); 

    return () => clearInterval(interval);
  }, [primaryHand.y, handCount, viewedImageId]);

  // --- LOGIC: Auto Rotate & Hover Selection (One Hand) ---
  useEffect(() => {
    if (handCount !== 1 || galleryImages.length === 0 || viewedImageId) {
        // Reset lock if hand is lost or viewing
        if (handCount === 0) setSelectionLocked(false);
        // Clear rotation if viewing
        if (autoRotationTimerRef.current && viewedImageId) {
            clearInterval(autoRotationTimerRef.current);
            autoRotationTimerRef.current = null;
        }
        return;
    }

    // 1. Auto Rotate Logic (Carousel)
    // Only rotate if NOT locked
    if (!selectionLocked) {
        if (!autoRotationTimerRef.current) {
            autoRotationTimerRef.current = window.setInterval(() => {
                setActiveImageIndex(prev => (prev + 1) % galleryImages.length);
            }, 2500); // Switch every 2.5s
        }
    } else {
        if (autoRotationTimerRef.current) {
            clearInterval(autoRotationTimerRef.current);
            autoRotationTimerRef.current = null;
        }
    }

    // 2. Selection Lock Logic (Hand Stationary for 2s)
    // Calculate movement delta
    const dist = Math.sqrt(
         Math.pow(primaryHand.x - prevPrimaryPosRef.current.x, 2) + 
         Math.pow(primaryHand.y - prevPrimaryPosRef.current.y, 2)
    );
     
    // If movement is very small (Hovering)
    if (dist < 0.01) {
         if (Date.now() - lastInteractionTimeRef.current > 2000 && !selectionLocked) {
             setSelectionLocked(true); // Lock the currently facing image
         }
    } else {
        // Hand moved, reset timer
        lastInteractionTimeRef.current = Date.now();
        // Optional: Unlock if moved significantly? 
        // For now, let's keep lock until Mode change or Hand lost to make it less frustrating.
        // Actually, let's unlock if hand moves aggressively to allow browsing again.
        if (dist > 0.1) {
            setSelectionLocked(false);
        }
    }

    prevPrimaryPosRef.current = { x: primaryHand.x, y: primaryHand.y };

    return () => {
         if (autoRotationTimerRef.current) clearInterval(autoRotationTimerRef.current);
    }
  }, [handCount, primaryHand, galleryImages.length, selectionLocked, viewedImageId]);


  // --- LOGIC: Inspection Mode (Two Hands) ---
  useEffect(() => {
      // Trigger: Hand Count 2 AND Selection Locked (or we have images)
      if (handCount === 2) {
          if (!viewedImageId && galleryImages.length > 0) {
              // Enter Inspection
              const currentImg = galleryImages[activeImageIndex];
              if (currentImg) setViewedImageId(currentImg.id);
          }
      } 
      // Exit Trigger: Hand Count drops
      else {
          if (viewedImageId) {
              setViewedImageId(null);
          }
      }
  }, [handCount, galleryImages, activeImageIndex, viewedImageId]);


  const toggleCamera = useCallback(() => {
    setIsCameraEnabled(prev => !prev);
  }, []);

  const addWish = useCallback((text: string) => {
    const newWish: Wish = {
      id: uuidv4(),
      text,
      position: [0, -5, 0], 
      timestamp: Date.now(),
    };
    setWishes(prev => [...prev, newWish]);
  }, []);

  const addImage = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    const newImg: GalleryImage = {
        id: uuidv4(),
        url,
        position: [0, 0, 0] 
    };
    setGalleryImages(prev => {
        const next = [...prev, newImg];
        setActiveImageIndex(prev.length); 
        return next;
    });
  }, []);

  return (
    <div className="relative w-full h-screen bg-[#000b1e] overflow-hidden select-none">
      <Scene 
        handState={primaryHand.state} 
        interactionValue={interactionValue} 
        wishes={wishes}
        galleryImages={galleryImages}
        activeImageIndex={activeImageIndex}
        viewedImageId={viewedImageId}
        selectionLocked={selectionLocked}
        primaryHandPos={primaryHand}
      />

      <HandTracker 
        enabled={isCameraEnabled} 
        onHandUpdate={handleHandUpdate} 
      />

      <Interface 
        onAddWish={addWish}
        onUploadImage={addImage}
        isCameraEnabled={isCameraEnabled}
        toggleCamera={toggleCamera}
        handState={primaryHand.state}
      />
    </div>
  );
};

export default App;
