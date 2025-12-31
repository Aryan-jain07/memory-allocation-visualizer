export type SimulationEventType =
  | 'PROCESS_ARRIVAL'
  | 'ALLOCATION_ATTEMPT'
  | 'ALLOCATION_SUCCESS'
  | 'ALLOCATION_FAILURE'
  | 'DEALLOCATION';

export interface SimulationEvent {
  time: number;
  type: SimulationEventType;
  processName?: string;
  holeId?: string;
  details: string;
}

