import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Process, 
  MemoryBlock, 
  Hole, 
  AllocationLog, 
  MemoryStats, 
  SimulationState,
  AllocationTechnique,
  PROCESS_COLORS 
} from '@/types/memory';

const DEFAULT_TOTAL_MEMORY = 1024;
const DEFAULT_SPEED = 1000;

const generateId = () => Math.random().toString(36).substr(2, 9);

export function useMemorySimulation() {
  const [totalMemory, setTotalMemory] = useState(DEFAULT_TOTAL_MEMORY);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [memoryBlocks, setMemoryBlocks] = useState<MemoryBlock[]>([
    { id: generateId(), start: 0, size: DEFAULT_TOTAL_MEMORY, processId: null, isHole: true }
  ]);
  const [logs, setLogs] = useState<AllocationLog[]>([]);
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

  const addLog = useCallback((
    type: AllocationLog['type'],
    message: string,
    details?: string,
    processId?: string,
    processName?: string
  ) => {
    const log: AllocationLog = {
      id: generateId(),
      timestamp: new Date(),
      type,
      message,
      details,
      processId,
      processName,
      technique: simulation.technique,
    };
    setLogs(prev => [log, ...prev].slice(0, 100));
  }, [simulation.technique]);

  const getHoles = useCallback((): Hole[] => {
    return memoryBlocks
      .filter(block => block.isHole)
      .map(block => ({
        id: block.id,
        start: block.start,
        end: block.start + block.size - 1,
        size: block.size,
      }));
  }, [memoryBlocks]);

  const getStats = useCallback((): MemoryStats => {
    const holes = getHoles();
    const usedMemory = memoryBlocks
      .filter(b => !b.isHole)
      .reduce((sum, b) => sum + b.size, 0);
    const freeMemory = totalMemory - usedMemory;

    return {
      totalMemory: totalMemory,
      usedMemory,
      freeMemory,
      utilization: (usedMemory / totalMemory) * 100,
      internalFragmentation: 0,
      externalFragmentation: holes.length > 1 ? holes.reduce((sum, h) => sum + h.size, 0) : 0,
      numberOfHoles: holes.length,
      numberOfProcesses: processes.filter(p => p.status === 'running').length,
    };
  }, [memoryBlocks, processes, getHoles, totalMemory]);

  const findFirstFit = useCallback((size: number): MemoryBlock | null => {
    const holes = memoryBlocks.filter(b => b.isHole && b.size >= size);
    return holes[0] || null;
  }, [memoryBlocks]);

  const findBestFit = useCallback((size: number): MemoryBlock | null => {
    const holes = memoryBlocks
      .filter(b => b.isHole && b.size >= size)
      .sort((a, b) => a.size - b.size);
    return holes[0] || null;
  }, [memoryBlocks]);

  const findWorstFit = useCallback((size: number): MemoryBlock | null => {
    const holes = memoryBlocks
      .filter(b => b.isHole && b.size >= size)
      .sort((a, b) => b.size - a.size);
    return holes[0] || null;
  }, [memoryBlocks]);

  const findNextFit = useCallback((size: number): MemoryBlock | null => {
    const holes = memoryBlocks.filter(b => b.isHole && b.size >= size);
    if (holes.length === 0) return null;

    const startIdx = simulation.lastFitIndex % holes.length;
    for (let i = 0; i < holes.length; i++) {
      const idx = (startIdx + i) % holes.length;
      if (holes[idx].size >= size) {
        setSimulation(prev => ({ ...prev, lastFitIndex: idx + 1 }));
        return holes[idx];
      }
    }
    return null;
  }, [memoryBlocks, simulation.lastFitIndex]);

  const findHole = useCallback((size: number, technique: AllocationTechnique): MemoryBlock | null => {
    switch (technique) {
      case 'first-fit': return findFirstFit(size);
      case 'best-fit': return findBestFit(size);
      case 'worst-fit': return findWorstFit(size);
      case 'next-fit': return findNextFit(size);
      default: return findFirstFit(size);
    }
  }, [findFirstFit, findBestFit, findWorstFit, findNextFit]);

  const allocateProcess = useCallback((process: Omit<Process, 'id' | 'color' | 'status' | 'remainingTime'>, manualAddress?: number) => {
    const color = PROCESS_COLORS[colorIndex.current % PROCESS_COLORS.length];
    colorIndex.current++;

    const newProcess: Process = {
      ...process,
      id: generateId(),
      color,
      status: process.arrivalTime <= simulation.currentTime ? 'waiting' : 'waiting',
      remainingTime: process.burstTime,
    };

    // If arrival time is in the future, just add to waiting queue
    if (process.arrivalTime > simulation.currentTime) {
      setProcesses(prev => [...prev, newProcess]);
      addLog(
        'info',
        `Queued ${newProcess.name} (${process.size} KB)`,
        `Will arrive at tick ${process.arrivalTime}`,
        newProcess.id,
        newProcess.name
      );
      return newProcess;
    }

    let targetBlock: MemoryBlock | null = null;

    if (manualAddress !== undefined) {
      const hole = memoryBlocks.find(b => 
        b.isHole && 
        b.start <= manualAddress && 
        b.start + b.size >= manualAddress + process.size
      );
      if (hole) {
        targetBlock = { ...hole, start: manualAddress };
      } else {
        addLog('error', `Cannot allocate ${process.name} at address ${manualAddress}`, 'Invalid or occupied address range');
        return null;
      }
    } else {
      targetBlock = findHole(process.size, simulation.technique);
    }

    if (!targetBlock) {
      addLog('error', `Cannot allocate ${process.name} (${process.size} KB)`, 'No suitable hole found');
      return null;
    }

    const allocatedAddress = manualAddress ?? targetBlock.start;
    newProcess.startAddress = allocatedAddress;
    newProcess.status = 'running';
    newProcess.allocatedAt = simulation.currentTime;

    setMemoryBlocks(prev => {
      const newBlocks: MemoryBlock[] = [];
      
      for (const block of prev) {
        if (block.id === targetBlock!.id) {
          if (allocatedAddress > block.start) {
            newBlocks.push({
              id: generateId(),
              start: block.start,
              size: allocatedAddress - block.start,
              processId: null,
              isHole: true,
            });
          }

          newBlocks.push({
            id: generateId(),
            start: allocatedAddress,
            size: process.size,
            processId: newProcess.id,
            processName: newProcess.name,
            color: newProcess.color,
            isHole: false,
          });

          const endOfAllocation = allocatedAddress + process.size;
          const endOfBlock = block.start + block.size;
          if (endOfAllocation < endOfBlock) {
            newBlocks.push({
              id: generateId(),
              start: endOfAllocation,
              size: endOfBlock - endOfAllocation,
              processId: null,
              isHole: true,
            });
          }
        } else {
          newBlocks.push(block);
        }
      }

      return newBlocks.sort((a, b) => a.start - b.start);
    });

    setProcesses(prev => [...prev, newProcess]);

    addLog(
      'allocation',
      `Allocated ${newProcess.name} (${process.size} KB)`,
      `Address: ${allocatedAddress}, Technique: ${simulation.technique}`,
      newProcess.id,
      newProcess.name
    );

    return newProcess;
  }, [memoryBlocks, simulation.technique, simulation.currentTime, findHole, addLog]);

  const deallocateProcess = useCallback((processId: string) => {
    const process = processes.find(p => p.id === processId);
    if (!process) return;

    setMemoryBlocks(prev => {
      const newBlocks = prev.map(block => {
        if (block.processId === processId) {
          return {
            ...block,
            processId: null,
            processName: undefined,
            color: undefined,
            isHole: true,
          };
        }
        return block;
      });

      const merged: MemoryBlock[] = [];
      for (const block of newBlocks) {
        const lastBlock = merged[merged.length - 1];
        if (lastBlock && lastBlock.isHole && block.isHole) {
          lastBlock.size += block.size;
        } else {
          merged.push({ ...block });
        }
      }

      return merged;
    });

    setProcesses(prev => prev.map(p => 
      p.id === processId ? { ...p, status: 'completed' as const } : p
    ));

    addLog(
      'deallocation',
      `Deallocated ${process.name}`,
      `Freed ${process.size} KB at address ${process.startAddress}`,
      process.id,
      process.name
    );
  }, [processes, addLog]);

  const tryAllocateWaitingProcess = useCallback((process: Process, currentTime: number) => {
    const targetBlock = findHole(process.size, simulation.technique);
    
    if (!targetBlock) {
      return null;
    }

    const allocatedAddress = targetBlock.start;

    setMemoryBlocks(prev => {
      const newBlocks: MemoryBlock[] = [];
      
      for (const block of prev) {
        if (block.id === targetBlock.id) {
          newBlocks.push({
            id: generateId(),
            start: allocatedAddress,
            size: process.size,
            processId: process.id,
            processName: process.name,
            color: process.color,
            isHole: false,
          });

          const remaining = block.size - process.size;
          if (remaining > 0) {
            newBlocks.push({
              id: generateId(),
              start: allocatedAddress + process.size,
              size: remaining,
              processId: null,
              isHole: true,
            });
          }
        } else {
          newBlocks.push(block);
        }
      }

      return newBlocks.sort((a, b) => a.start - b.start);
    });

    addLog(
      'allocation',
      `Allocated ${process.name} (${process.size} KB)`,
      `Address: ${allocatedAddress}, Arrived at tick ${process.arrivalTime}`,
      process.id,
      process.name
    );

    return allocatedAddress;
  }, [simulation.technique, findHole, addLog]);

  const tick = useCallback(() => {
    setSimulation(prev => ({ ...prev, currentTime: prev.currentTime + 1 }));

    const newTime = simulation.currentTime + 1;

    // Check for processes that have arrived and need allocation
    setProcesses(prev => {
      const updated = prev.map(p => {
        // Process arriving now
        if (p.status === 'waiting' && p.arrivalTime <= newTime && p.startAddress === undefined) {
          const address = tryAllocateWaitingProcess(p, newTime);
          if (address !== null) {
            return { ...p, status: 'running' as const, startAddress: address, allocatedAt: newTime };
          }
        }
        // Running process ticking down
        if (p.status === 'running' && p.remainingTime > 0) {
          return { ...p, remainingTime: p.remainingTime - 1 };
        }
        return p;
      });

      updated.forEach(p => {
        if (p.status === 'running' && p.remainingTime === 0) {
          deallocateProcess(p.id);
        }
      });

      return updated;
    });
  }, [deallocateProcess, simulation.currentTime, tryAllocateWaitingProcess]);

  const startSimulation = useCallback(() => {
    setSimulation(prev => ({ ...prev, isRunning: true, isPaused: false }));
  }, []);

  const pauseSimulation = useCallback(() => {
    setSimulation(prev => ({ ...prev, isPaused: true }));
  }, []);

  const resumeSimulation = useCallback(() => {
    setSimulation(prev => ({ ...prev, isPaused: false }));
  }, []);

  const resetSimulation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setProcesses([]);
    setMemoryBlocks([
      { id: generateId(), start: 0, size: totalMemory, processId: null, isHole: true }
    ]);
    setLogs([]);
    setSimulation({
      isRunning: false,
      isPaused: false,
      speed: DEFAULT_SPEED,
      currentTime: 0,
      technique: simulation.technique,
      lastFitIndex: 0,
    });
    colorIndex.current = 0;
    addLog('info', 'Simulation reset', 'Memory cleared');
  }, [simulation.technique, addLog, totalMemory]);

  const changeTotalMemory = useCallback((newSize: number) => {
    setTotalMemory(newSize);
    setMemoryBlocks([
      { id: generateId(), start: 0, size: newSize, processId: null, isHole: true }
    ]);
    setProcesses([]);
    addLog('info', `Memory size changed to ${newSize} KB`, 'Simulation reset');
  }, [addLog]);

  const setSpeed = useCallback((speed: number) => {
    setSimulation(prev => ({ ...prev, speed }));
  }, []);

  const setTechnique = useCallback((technique: AllocationTechnique) => {
    setSimulation(prev => ({ ...prev, technique, lastFitIndex: 0 }));
    addLog('info', `Switched to ${technique}`, 'Allocation technique changed');
  }, [addLog]);

  useEffect(() => {
    if (simulation.isRunning && !simulation.isPaused) {
      intervalRef.current = setInterval(tick, simulation.speed);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [simulation.isRunning, simulation.isPaused, simulation.speed, tick]);

  return {
    processes,
    memoryBlocks,
    logs,
    simulation,
    stats: getStats(),
    holes: getHoles(),
    totalMemory,
    allocateProcess,
    deallocateProcess,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    resetSimulation,
    setSpeed,
    setTechnique,
    changeTotalMemory,
    addLog,
  };
}
