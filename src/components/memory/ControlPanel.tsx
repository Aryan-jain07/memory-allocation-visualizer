import { motion } from 'framer-motion';
import { useState, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AllocationTechnique, SimulationState } from '@/types/memory';
import { generateTemplate } from '@/lib/excel/generateTemplate';
import { parseExcel, ExcelParseError } from '@/lib/excel/parseExcel';

interface ControlPanelProps {
  simulation: SimulationState;
  totalMemory: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onTechniqueChange: (technique: AllocationTechnique) => void;
  onTotalMemoryChange: (size: number) => void;
  onAllocateProcess: (process: { name: string; size: number; burstTime: number; arrivalTime: number }, manualAddress?: number) => void;
}

const TECHNIQUES: { value: AllocationTechnique; label: string }[] = [
  { value: 'first-fit', label: 'First Fit' },
  { value: 'best-fit', label: 'Best Fit' },
  { value: 'worst-fit', label: 'Worst Fit' },
  { value: 'next-fit', label: 'Next Fit' },
];

export function ControlPanel({
  simulation,
  totalMemory,
  onStart,
  onPause,
  onResume,
  onReset,
  onSpeedChange,
  onTechniqueChange,
  onTotalMemoryChange,
  onAllocateProcess,
}: ControlPanelProps) {
  const speedMs = simulation.speed;
  const speedLabel = speedMs >= 1000 
    ? `${(speedMs / 1000).toFixed(1)}s` 
    : `${speedMs}ms`;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleGenerateTemplate = () => {
    generateTemplate();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsedData = await parseExcel(file);

      // Reset simulation first
      onReset();

      // Set total memory
      onTotalMemoryChange(parsedData.totalMemory);

      // Allocate each process with default values for burstTime and arrivalTime
      for (const process of parsedData.processes) {
        onAllocateProcess({
          name: process.name,
          size: process.size,
          burstTime: 1000, // Default burst time
          arrivalTime: 0, // Default arrival time (immediate)
        });
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      if (error instanceof ExcelParseError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
      }
      setErrorDialogOpen(true);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-3"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded bg-primary/20 neon-glow">
            <Settings className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-display text-sm text-primary neon-text">CONTROL PANEL</h3>
        </div>

        <div className="space-y-3">
        {/* Playback controls */}
        <div className="flex items-center gap-2">
          {!simulation.isRunning ? (
            <Button
              onClick={onStart}
              size="sm"
              className="flex-1 bg-success hover:bg-success/80 text-success-foreground font-display text-xs"
            >
              <Play className="w-3 h-3 mr-1" />
              START
            </Button>
          ) : simulation.isPaused ? (
            <Button
              onClick={onResume}
              size="sm"
              className="flex-1 bg-success hover:bg-success/80 text-success-foreground font-display text-xs"
            >
              <Play className="w-3 h-3 mr-1" />
              RESUME
            </Button>
          ) : (
            <Button
              onClick={onPause}
              size="sm"
              className="flex-1 bg-warning hover:bg-warning/80 text-warning-foreground font-display text-xs"
            >
              <Pause className="w-3 h-3 mr-1" />
              PAUSE
            </Button>
          )}
          
          <Button
            onClick={onReset}
            variant="outline"
            size="sm"
            className="border-destructive text-destructive hover:bg-destructive/10"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>

        {/* Technique selector */}
        <div className="space-y-1">
          <Label className="text-muted-foreground text-xs">Allocation Technique</Label>
          <Select
            value={simulation.technique}
            onValueChange={(value) => onTechniqueChange(value as AllocationTechnique)}
          >
            <SelectTrigger className="bg-muted/50 border-border h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {TECHNIQUES.map((tech) => (
                <SelectItem key={tech.value} value={tech.value} className="text-xs">
                  {tech.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Total Memory Size */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-muted-foreground text-xs">Total Memory</Label>
            <span className="text-xs font-mono text-primary">{totalMemory} KB</span>
          </div>
          <Slider
            value={[totalMemory]}
            onValueChange={([value]) => onTotalMemoryChange(value)}
            min={256}
            max={4096}
            step={128}
            disabled={simulation.isRunning}
            className="[&_[role=slider]]:bg-accent [&_[role=slider]]:border-accent [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
          />
        </div>

        {/* Speed control */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-muted-foreground text-xs">Speed</Label>
            <span className="text-xs font-mono text-primary">{speedLabel}/tick</span>
          </div>
          <Slider
            value={[speedMs]}
            onValueChange={([value]) => onSpeedChange(value)}
            min={100}
            max={3000}
            step={100}
            className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
          />
        </div>

        {/* Status indicator */}
        <div className="p-2 rounded bg-muted/30 border border-border">
          <div className="flex items-center gap-2">
            <div 
              className={`w-2 h-2 rounded-full ${
                simulation.isRunning && !simulation.isPaused
                  ? 'bg-success animate-pulse'
                  : simulation.isPaused
                  ? 'bg-warning'
                  : 'bg-muted-foreground'
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {simulation.isRunning && !simulation.isPaused
                ? 'Running'
                : simulation.isPaused
                ? 'Paused'
                : 'Stopped'}
            </span>
          </div>
        </div>

        {/* Excel import/export buttons */}
        <div className="flex flex-col gap-2 pt-2 border-t border-border">
          <Button
            onClick={handleGenerateTemplate}
            size="sm"
            variant="outline"
            className="w-full text-xs"
            disabled={simulation.isRunning}
          >
            <Download className="w-3 h-3 mr-1" />
            Generate Demo Excel
          </Button>
          <Button
            onClick={handleUploadClick}
            size="sm"
            variant="outline"
            className="w-full text-xs"
            disabled={simulation.isRunning}
          >
            <Upload className="w-3 h-3 mr-1" />
            Upload Excel
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>
    </motion.div>

    <AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Invalid Excel File</AlertDialogTitle>
          <AlertDialogDescription>
            {errorMessage}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => setErrorDialogOpen(false)}>
            OK
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
