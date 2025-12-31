import { motion } from 'framer-motion';
import { useMemorySimulation } from '@/hooks/useMemorySimulation';
import { Header } from '@/components/memory/Header';
import { Timeline } from '@/components/memory/Timeline';
import { MemoryBar } from '@/components/memory/MemoryBar';
import { ProcessForm } from '@/components/memory/ProcessForm';
import { ControlPanel } from '@/components/memory/ControlPanel';
import { StatsPanel } from '@/components/memory/StatsPanel';
import { HolesTable } from '@/components/memory/HolesTable';
import { AllocationLogs } from '@/components/memory/AllocationLogs';
import { ProcessList } from '@/components/memory/ProcessList';

const Index = () => {
  const {
    processes,
    memoryBlocks,
    logs,
    events,
    simulation,
    stats,
    holes,
    totalMemory,
    allocateProcess,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    resetSimulation,
    setSpeed,
    setTechnique,
    changeTotalMemory,
  } = useMemorySimulation();

  const handleAddProcess = (
    process: { name: string; size: number; burstTime: number; arrivalTime: number },
    manualAddress?: number
  ) => {
    // Manual address is no longer supported in the refactored hook
    allocateProcess(process);
  };

  return (
    <div className="min-h-screen bg-background cyber-grid relative overflow-x-hidden">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <Header />

        <main className="container mx-auto px-4 py-3">
          {/* Timeline visualization */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-3"
          >
            <Timeline events={events} currentTime={simulation.currentTime} />
          </motion.section>

          {/* Memory visualization */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-3"
          >
            <MemoryBar blocks={memoryBlocks} totalMemory={totalMemory} />
          </motion.section>

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Left column - Controls and Process Form */}
            <div className="lg:col-span-3 space-y-3">
              <ControlPanel
                simulation={simulation}
                totalMemory={totalMemory}
                onStart={startSimulation}
                onPause={pauseSimulation}
                onResume={resumeSimulation}
                onReset={resetSimulation}
                onSpeedChange={setSpeed}
                onTechniqueChange={setTechnique}
                onTotalMemoryChange={changeTotalMemory}
                onAllocateProcess={allocateProcess}
              />
              <ProcessForm onSubmit={handleAddProcess} currentTime={simulation.currentTime} />
            </div>

            {/* Center column - Process List and Holes */}
            <div className="lg:col-span-5 space-y-3">
              <ProcessList 
                processes={processes} 
                onTerminate={() => {}}
              />
              <HolesTable holes={holes} />
            </div>

            {/* Right column - Stats and Logs */}
            <div className="lg:col-span-4 space-y-3">
              <StatsPanel stats={stats} currentTime={simulation.currentTime} />
              <AllocationLogs logs={logs} />
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-border py-3 mt-4">
          <div className="container mx-auto px-4 text-center">
            <p className="text-xs text-muted-foreground font-mono">
              OS Memory Allocation Visualizer • Contiguous Allocation Techniques
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
