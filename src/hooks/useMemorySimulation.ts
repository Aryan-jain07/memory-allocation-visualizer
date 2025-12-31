import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Process,
  MemoryBlock,
  Hole,
  AllocationLog,
  MemoryStats,
  SimulationState,
  AllocationTechnique,
  PROCESS_COLORS,
} from '@/types/memory';
import { SimulationEvent } from '@/types/simulationEvents';

const DEFAULT_TOTAL_MEMORY = 1024;
const DEFAULT_SPEED = 1000;

const generateId = () => Math.random().toString(36).slice(2, 9);

export function useMemorySimulation() {
  const [totalMemory, setTotalMemory] = useState(DEFAULT_TOTAL_MEMORY);

  const [memoryBlocks, setMemoryBlocks] = useState<MemoryBlock[]>([
    { id: generateId(), start: 0, size: DEFAULT_TOTAL_MEMORY, processId: null, isHole: true },
  ]);

  const [processes, setProcesses] = useState<Process[]>([]);
  const [logs, setLogs] = useState<AllocationLog[]>([]);
  const [events, setEvents] = useState<SimulationEvent[]>([]);

  const [simulation, setSimulation] = useState<SimulationState>({
    isRunning: false,
    isPaused: false,
    speed: DEFAULT_SPEED,
    currentTime: 0,
    technique: 'first-fit',
    lastFitIndex: 0,
  });

  const colorIndex = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /* -------------------- helpers -------------------- */

  const addEvent = useCallback((event: SimulationEvent) => {
    setEvents(prev => [...prev, event]);
  }, []);

  const addLog = useCallback(
    (type: AllocationLog['type'], message: string, details?: string, process?: Process) => {
      setLogs(prev =>
        [
          {
            id: generateId(),
            timestamp: new Date(),
            type,
            message,
            details,
            processId: process?.id,
            processName: process?.name,
            technique: simulation.technique,
          },
          ...prev,
        ].slice(0, 100)
      );
    },
    [simulation.technique]
  );

  const getHoles = useCallback((): Hole[] => {
    return memoryBlocks
      .filter(b => b.isHole)
      .map(b => ({
        id: b.id,
        start: b.start,
        end: b.start + b.size - 1,
        size: b.size,
      }));
  }, [memoryBlocks]);

  const getStats = useCallback((): MemoryStats => {
    const usedMemory = memoryBlocks.filter(b => !b.isHole).reduce((s, b) => s + b.size, 0);
    const freeMemory = totalMemory - usedMemory;
    const holes = getHoles();

    return {
      totalMemory,
      usedMemory,
      freeMemory,
      utilization: (usedMemory / totalMemory) * 100,
      internalFragmentation: 0,
      externalFragmentation: holes.length > 1 ? holes.reduce((s, h) => s + h.size, 0) : 0,
      numberOfHoles: holes.length,
      numberOfProcesses: processes.filter(p => p.status === 'running').length,
    };
  }, [memoryBlocks, processes, getHoles, totalMemory]);

  /* -------------------- hole selection -------------------- */

  const findHole = useCallback(
    (size: number): MemoryBlock | null => {
      const holes = memoryBlocks.filter(b => b.isHole && b.size >= size);
      if (!holes.length) return null;

      switch (simulation.technique) {
        case 'best-fit':
          return [...holes].sort((a, b) => a.size - b.size)[0];
        case 'worst-fit':
          return [...holes].sort((a, b) => b.size - a.size)[0];
        case 'next-fit': {
          const idx = simulation.lastFitIndex % holes.length;
          setSimulation(prev => ({ ...prev, lastFitIndex: idx + 1 }));
          return holes[idx];
        }
        default:
          return holes[0];
      }
    },
    [memoryBlocks, simulation.technique, simulation.lastFitIndex]
  );

  /* -------------------- memory mutation -------------------- */

  const allocateIntoMemory = useCallback(
    (process: Process, block: MemoryBlock, address: number) => {
      setMemoryBlocks(prev => {
        const next: MemoryBlock[] = [];

        for (const b of prev) {
          if (b.id !== block.id) {
            next.push(b);
            continue;
          }

          if (address > b.start) {
            next.push({
              id: generateId(),
              start: b.start,
              size: address - b.start,
              processId: null,
              isHole: true,
            });
          }

          next.push({
            id: generateId(),
            start: address,
            size: process.size,
            processId: process.id,
            processName: process.name,
            color: process.color,
            isHole: false,
          });

          const end = address + process.size;
          const blockEnd = b.start + b.size;
          if (end < blockEnd) {
            next.push({
              id: generateId(),
              start: end,
              size: blockEnd - end,
              processId: null,
              isHole: true,
            });
          }
        }

        return next.sort((a, b) => a.start - b.start);
      });
    },
    []
  );

  const freeMemoryForProcess = useCallback((process: Process) => {
    addEvent({
      time: simulation.currentTime,
      type: 'DEALLOCATION',
      processName: process.name,
      details: `Freed ${process.size} KB`,
    });

    setMemoryBlocks(prev => {
      const cleared = prev.map(b =>
        b.processId === process.id ? { ...b, processId: null, isHole: true } : b
      );

      const merged: MemoryBlock[] = [];
      for (const b of cleared) {
        const last = merged.at(-1);
        if (last && last.isHole && b.isHole) last.size += b.size;
        else merged.push({ ...b });
      }

      return merged;
    });
  }, [simulation.currentTime, addEvent]);

  /* -------------------- public API -------------------- */

  const allocateProcess = useCallback(
    (input: Omit<Process, 'id' | 'color' | 'status' | 'remainingTime'>) => {
      const color = PROCESS_COLORS[colorIndex.current++ % PROCESS_COLORS.length];

      const process: Process = {
        ...input,
        id: generateId(),
        color,
        status: 'waiting',
        remainingTime: input.burstTime,
      };

      setProcesses(prev => [...prev, process]);
      addLog('info', `Queued ${process.name}`, `Arrives at t=${process.arrivalTime}`, process);

      return process;
    },
    [addLog]
  );

  /* -------------------- time -------------------- */

  const tick = useCallback(() => {
    const nextTime = simulation.currentTime + 1;
    setSimulation(prev => ({ ...prev, currentTime: nextTime }));

    setProcesses(prev =>
      prev.map(p => {
        // arrival
        if (p.status === 'waiting' && p.arrivalTime === nextTime) {
          addEvent({
            time: nextTime,
            type: 'PROCESS_ARRIVAL',
            processName: p.name,
            details: `${p.name} arrived`,
          });

          const hole = findHole(p.size);
          if (hole) {
            allocateIntoMemory(p, hole, hole.start);

            addEvent({
              time: nextTime,
              type: 'ALLOCATION_SUCCESS',
              processName: p.name,
              holeId: hole.id,
              details: `Allocated using ${simulation.technique}`,
            });

            return {
              ...p,
              status: 'running',
              startAddress: hole.start,
              allocatedAt: nextTime,
            };
          }

          addEvent({
            time: nextTime,
            type: 'ALLOCATION_FAILURE',
            processName: p.name,
            details: `No suitable hole`,
          });
        }

        // execution
        if (p.status === 'running') {
          const remaining = p.remainingTime - 1;
          return remaining === 0
            ? { ...p, remainingTime: 0, status: 'completed' }
            : { ...p, remainingTime: remaining };
        }

        return p;
      })
    );
  }, [
    simulation.currentTime,
    simulation.technique,
    findHole,
    allocateIntoMemory,
    addEvent,
  ]);

  /* -------------------- deallocation effect -------------------- */

  useEffect(() => {
    const completed = processes.filter(
      p => p.status === 'completed' && p.startAddress !== undefined
    );

    completed.forEach(p => freeMemoryForProcess(p));
  }, [processes, freeMemoryForProcess]);

  /* -------------------- controls -------------------- */

  const startSimulation = () =>
    setSimulation(prev => ({ ...prev, isRunning: true, isPaused: false }));

  const pauseSimulation = () =>
    setSimulation(prev => ({ ...prev, isPaused: true }));

  const resumeSimulation = () =>
    setSimulation(prev => ({ ...prev, isPaused: false }));

  const resetSimulation = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setProcesses([]);
    setEvents([]);
    setLogs([]);
    setMemoryBlocks([{ id: generateId(), start: 0, size: totalMemory, processId: null, isHole: true }]);
    setSimulation(prev => ({ ...prev, isRunning: false, currentTime: 0, lastFitIndex: 0 }));
    colorIndex.current = 0;
  };

  const changeTotalMemory = (size: number) => {
    setTotalMemory(size);
    setMemoryBlocks([{ id: generateId(), start: 0, size, processId: null, isHole: true }]);
    setProcesses([]);
    setEvents([]);
  };

  useEffect(() => {
    if (simulation.isRunning && !simulation.isPaused) {
      intervalRef.current = setInterval(tick, simulation.speed);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => intervalRef.current && clearInterval(intervalRef.current);
  }, [simulation.isRunning, simulation.isPaused, simulation.speed, tick]);

  return {
    processes,
    memoryBlocks,
    logs,
    events,
    simulation,
    stats: getStats(),
    holes: getHoles(),
    totalMemory,
    allocateProcess,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    resetSimulation,
    setSpeed: (speed: number) => setSimulation(p => ({ ...p, speed })),
    setTechnique: (t: AllocationTechnique) =>
      setSimulation(p => ({ ...p, technique: t, lastFitIndex: 0 })),
    changeTotalMemory,
  };
}
