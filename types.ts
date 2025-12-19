
import { Vector3 } from 'three';

export interface Wish {
  id: string;
  text: string;
  position: [number, number, number];
  timestamp: number;
}

export interface GalleryImage {
  id: string;
  url: string;
  position: [number, number, number];
}

export enum HandState {
  IDLE = 'IDLE',
  OPEN_PALM = 'OPEN_PALM',
  CLOSED_FIST = 'CLOSED_FIST',
  LOADING = 'LOADING',
  ERROR = 'ERROR'
}

export enum SwipeDirection {
  NONE = 'NONE',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

export interface HandData {
    state: HandState;
    x: number; // Normalized 0-1
    y: number; // Normalized 0-1
}

export interface AppState {
  handState: HandState; 
  handCount: number;
  primaryHandPos: HandData;
  setHandData: (count: number, primary: HandData, secondary: HandData) => void;
  interactionValue: number;
  wishes: Wish[];
  addWish: (text: string) => void;
  galleryImages: GalleryImage[];
  addImage: (file: File) => void;
  isCameraEnabled: boolean;
  toggleCamera: () => void;
  activeImageIndex: number;
  viewedImageId: string | null;
  selectionLocked: boolean; 
}
