
import React, { useEffect, useRef, useState } from 'react';
import * as mpHands from '@mediapipe/hands';
import { HandState, HandData } from '../types';
import { RefreshCw } from 'lucide-react';

interface HandTrackerProps {
  onHandUpdate: (count: number, primary: HandData, secondary: HandData) => void;
  enabled: boolean;
}

const HandTracker: React.FC<HandTrackerProps> = ({ onHandUpdate, enabled }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const requestRef = useRef<number>(0);
  
  // Helper to determine hand state
  const getHandState = (landmarks: any): HandState => {
      const wrist = landmarks[0];
      const tips = [8, 12, 16, 20]; 
      const pips = [6, 10, 14, 18]; 
      
      let extendedFingers = 0;
      for (let i = 0; i < tips.length; i++) {
        const distTip = Math.sqrt(Math.pow(landmarks[tips[i]].x - wrist.x, 2) + Math.pow(landmarks[tips[i]].y - wrist.y, 2));
        const distPip = Math.sqrt(Math.pow(landmarks[pips[i]].x - wrist.x, 2) + Math.pow(landmarks[pips[i]].y - wrist.y, 2));
        if (distTip > distPip * 1.2) {
          extendedFingers++;
        }
      }
      return extendedFingers >= 3 ? HandState.OPEN_PALM : HandState.CLOSED_FIST;
  };

  useEffect(() => {
    let isActive = true;
    let hands: any | null = null;
    let stream: MediaStream | null = null;

    if (!enabled) {
      onHandUpdate(0, { state: HandState.IDLE, x: 0.5, y: 0.5 }, { state: HandState.IDLE, x: 0.5, y: 0.5 });
      setIsLoading(false);
      return;
    }

    const onResults = (results: any) => {
      if (!isActive) return;
      setIsLoading(false);
      
      const count = results.multiHandLandmarks ? results.multiHandLandmarks.length : 0;
      
      let primary: HandData = { state: HandState.IDLE, x: 0.5, y: 0.5 };
      let secondary: HandData = { state: HandState.IDLE, x: 0.5, y: 0.5 };

      if (count > 0) {
        // Assume first detected hand is "Primary" (Right hand usually if alone)
        const lm0 = results.multiHandLandmarks[0];
        primary = {
            state: getHandState(lm0),
            x: lm0[9].x, // Use Middle Finger Knuckle (MCP) for stable center tracking
            y: lm0[9].y
        };

        if (count > 1) {
            const lm1 = results.multiHandLandmarks[1];
            secondary = {
                state: getHandState(lm1),
                x: lm1[9].x,
                y: lm1[9].y
            };
        }
      }
      
      onHandUpdate(count, primary, secondary);
    };

    const initMediaPipe = async () => {
      try {
        const HandsClass = (mpHands as any).Hands || (mpHands as any).default?.Hands;

        if (!HandsClass) {
            throw new Error("Hands class not found in @mediapipe/hands module");
        }

        hands = new HandsClass({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`;
          },
        });

        hands.setOptions({
          maxNumHands: 2, 
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        hands.onResults(onResults);

        if (videoRef.current) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: 320,
                height: 240,
                facingMode: 'user'
              }
            });

            if (isActive && videoRef.current) {
                videoRef.current.srcObject = stream;
                
                await new Promise<void>((resolve) => {
                    if (!videoRef.current) return resolve();
                    if (videoRef.current.readyState >= 2) return resolve();
                    videoRef.current.onloadeddata = () => resolve();
                });
                
                if (isActive && videoRef.current) {
                    await videoRef.current.play();
                }

                const sendFrame = async () => {
                    if (!isActive) return;
                    
                    if (videoRef.current && hands && videoRef.current.readyState >= 2) {
                         try {
                             await hands.send({ image: videoRef.current });
                         } catch (e) { }
                    }
                    
                    if (isActive) {
                        requestRef.current = requestAnimationFrame(sendFrame);
                    }
                };
                
                sendFrame();
            }
          } catch (err) {
             console.error("Camera error:", err);
             if (isActive) {
                 setCameraError("Permission denied");
                 onHandUpdate(0, { state: HandState.ERROR, x: 0.5, y: 0.5 }, { state: HandState.ERROR, x: 0.5, y: 0.5 });
                 setIsLoading(false);
             }
          }
        }
      } catch (err) {
        console.error("Failed to initialize MediaPipe:", err);
        if (isActive) {
            setCameraError("Init Failed");
            onHandUpdate(0, { state: HandState.ERROR, x: 0.5, y: 0.5 }, { state: HandState.ERROR, x: 0.5, y: 0.5 });
            setIsLoading(false);
        }
      }
    };

    initMediaPipe();

    return () => {
      isActive = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (hands) hands.close();
      if (stream) {
          stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
          videoRef.current.srcObject = null;
      }
    };
  }, [enabled, onHandUpdate]);

  if (!enabled) return null;

  return (
    <div className="fixed top-4 left-4 z-50">
      <div className="relative overflow-hidden rounded-xl border border-white/20 shadow-2xl bg-black/40 backdrop-blur-md w-32 h-24">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 opacity-60"
          playsInline
          muted
        />
        
        <div className="absolute bottom-1 left-2 text-[10px] text-white font-mono flex items-center gap-1">
          {isLoading ? (
            <span className="flex items-center gap-1 text-yellow-400">
               <RefreshCw className="w-3 h-3 animate-spin" /> Init...
            </span>
          ) : cameraError ? (
            <span className="text-red-400">Error</span>
          ) : (
            <span className="text-green-400">Tracking Active</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default HandTracker;
