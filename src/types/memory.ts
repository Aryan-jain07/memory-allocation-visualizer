export type AllocationTechnique = 
  | 'first-fit' 
  | 'best-fit' 
  | 'worst-fit' 
  | 'next-fit'
  | 'paging'
  | 'segmentation';

export interface Process {
  id: string;
  name: string;
  size: number;
  burstTime: number;
  remainingTime: number;
  arrivalTime: number;
  color: string;
  startAddress?: number;
  allocatedAt?: number;
  status: 'waiting' | 'running' | 'completed';
  pages?: number[];
  segments?: Segment[];
}

export interface MemoryBlock {
  id: string;
  start: number;
  size: number;
  processId: string | null;
  processName?: string;
  color?: string;
  isHole: boolean;
}

export interface Hole {
  id: string;
  start: number;
  end: number;
  size: number;
}

export interface Segment {
  id: string;
  name: string;
  base: number;
  limit: number;
  processId: string;
}

export interface Page {
  pageNumber: number;
  frameNumber: number | null;
  processId: string;
  valid: boolean;
}

export interface Frame {
  frameNumber: number;
  pageNumber: number | null;
  processId: string | null;
  free: boolean;
}

export interface AllocationLog {
  id: string;
  timestamp: Date;
  type: 'allocation' | 'deallocation' | 'error' | 'info' | 'compaction';
  processId?: string;
  processName?: string;
  message: string;
  details?: string;
  technique?: AllocationTechnique;
}

export interface MemoryStats {
  totalMemory: number;
  usedMemory: number;
  freeMemory: number;
  utilization: number;
  internalFragmentation: number;
  externalFragmentation: number;
  numberOfHoles: number;
  numberOfProcesses: number;
}

export interface SimulationState {
  isRunning: boolean;
  isPaused: boolean;
  speed: number;
  currentTime: number;
  technique: AllocationTechnique;
  lastFitIndex: number;
}

export const PROCESS_COLORS = [
  'hsl(185, 100%, 50%)',   // cyan
  'hsl(270, 80%, 60%)',    // purple
  'hsl(320, 100%, 60%)',   // pink
  'hsl(150, 100%, 50%)',   // green
  'hsl(25, 100%, 55%)',    // orange
  'hsl(210, 100%, 60%)',   // blue
  'hsl(45, 100%, 50%)',    // yellow
  'hsl(0, 85%, 60%)',      // red
];
