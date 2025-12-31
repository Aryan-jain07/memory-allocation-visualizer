import { motion } from 'framer-motion';
import { SimulationEvent } from '@/types/simulationEvents';

interface TimelineProps {
  events: SimulationEvent[];
  currentTime: number;
}

const EVENT_COLORS: Record<SimulationEvent['type'], string> = {
  PROCESS_ARRIVAL: 'hsl(210, 100%, 60%)', // blue
  ALLOCATION_SUCCESS: 'hsl(150, 100%, 50%)', // green
  DEALLOCATION: 'hsl(0, 85%, 60%)', // red
  ALLOCATION_FAILURE: 'hsl(45, 100%, 50%)', // yellow
  ALLOCATION_ATTEMPT: 'hsl(270, 80%, 60%)', // purple/gray for attempts
};

export function Timeline({ events, currentTime }: TimelineProps) {
  // Calculate max time to determine scale (use currentTime or max event time, whichever is larger)
  const maxTime = Math.max(
    currentTime,
    events.length > 0 ? Math.max(...events.map(e => e.time)) : 0,
    10 // minimum scale of 10
  );

  // Scale: pixels per time unit
  const PIXELS_PER_TICK = 8;
  const timelineWidth = Math.max(maxTime * PIXELS_PER_TICK, 400);

  const getEventColor = (type: SimulationEvent['type']): string => {
    return EVENT_COLORS[type] || 'hsl(270, 80%, 60%)';
  };

  const getEventPosition = (time: number): number => {
    return (time / maxTime) * timelineWidth;
  };

  const currentTimePosition = getEventPosition(currentTime);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-panel p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display text-sm text-primary neon-text">TIMELINE</h3>
        <span className="text-xs text-muted-foreground">t={currentTime}</span>
      </div>

      {/* Timeline container with horizontal scroll */}
      <div className="relative overflow-x-auto overflow-y-visible">
        <div
          className="relative h-20 bg-muted/30 rounded border border-border"
          style={{ width: `${timelineWidth}px`, minWidth: '100%' }}
        >
          {/* Grid overlay */}
          <div className="absolute inset-0 cyber-grid-dense opacity-20" />

          {/* Time markers */}
          <div className="absolute inset-x-0 top-0 flex h-full">
            {Array.from({ length: Math.floor(maxTime / 10) + 1 }, (_, i) => {
              const tick = i * 10;
              const position = getEventPosition(tick);
              if (position > timelineWidth) return null;
              return (
                <div
                  key={tick}
                  className="absolute top-0 h-full border-l border-border/30"
                  style={{ left: `${position}px` }}
                >
                  <span className="absolute -top-4 left-0 text-[9px] text-muted-foreground font-mono">
                    {tick}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Timeline track */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-border/50 -translate-y-1/2" />

          {/* Event dots */}
          {events.map((event, index) => {
            const position = getEventPosition(event.time);
            const color = getEventColor(event.type);
            const tooltip = `${event.type}${event.processName ? `: ${event.processName}` : ''}\n${event.details}`;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.01 }}
                className="absolute top-1/2 -translate-y-1/2 cursor-pointer group"
                style={{ left: `${position}px` }}
                title={tooltip}
              >
                {/* Event dot */}
                <div
                  className="w-3 h-3 rounded-full border-2 border-background shadow-lg transition-all group-hover:scale-125 group-hover:z-10"
                  style={{
                    backgroundColor: color,
                    boxShadow: `0 0 8px ${color}80, 0 0 16px ${color}40`,
                  }}
                />

                {/* Hover line indicator */}
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 w-px h-8 bg-current opacity-0 group-hover:opacity-30 -translate-y-full"
                  style={{ color }}
                />
              </motion.div>
            );
          })}

          {/* Current time cursor */}
          {currentTime >= 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute top-0 bottom-0 w-0.5 bg-primary"
              style={{ left: `${currentTimePosition}px` }}
            >
              {/* Cursor glow */}
              <div className="absolute inset-0 bg-primary blur-sm opacity-50" />
              
              {/* Cursor label */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <div className="px-1.5 py-0.5 bg-primary text-background text-[9px] font-mono rounded shadow-lg">
                  {currentTime}
                </div>
              </div>

              {/* Cursor pulse animation */}
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.8, 0, 0.8],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2 pt-2 border-t border-border">
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: EVENT_COLORS.PROCESS_ARRIVAL }}
          />
          <span className="text-[10px] text-muted-foreground">Arrival</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: EVENT_COLORS.ALLOCATION_SUCCESS }}
          />
          <span className="text-[10px] text-muted-foreground">Success</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: EVENT_COLORS.ALLOCATION_FAILURE }}
          />
          <span className="text-[10px] text-muted-foreground">Failure</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: EVENT_COLORS.DEALLOCATION }}
          />
          <span className="text-[10px] text-muted-foreground">Deallocation</span>
        </div>
      </div>
    </motion.div>
  );
}

