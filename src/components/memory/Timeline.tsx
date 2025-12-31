import { motion, AnimatePresence } from 'framer-motion';
import { SimulationEvent } from '@/types/simulationEvents';
import { useState } from 'react';

interface TimelineProps {
  events: SimulationEvent[];
  currentTime: number;
}

interface EventStyle {
  color: string;
  shape: 'circle' | 'square' | 'triangle' | 'diamond';
  icon: string;
}

const EVENT_STYLES: Record<SimulationEvent['type'], EventStyle> = {
  PROCESS_ARRIVAL: {
    color: 'hsl(210, 100%, 60%)',
    shape: 'circle',
    icon: '→',
  },
  ALLOCATION_SUCCESS: {
    color: 'hsl(150, 100%, 50%)',
    shape: 'square',
    icon: '✓',
  },
  DEALLOCATION: {
    color: 'hsl(0, 85%, 60%)',
    shape: 'diamond',
    icon: '×',
  },
  ALLOCATION_FAILURE: {
    color: 'hsl(45, 100%, 50%)',
    shape: 'triangle',
    icon: '!',
  },
  ALLOCATION_ATTEMPT: {
    color: 'hsl(270, 80%, 60%)',
    shape: 'circle',
    icon: '⟳',
  },
};

// Simple hash function for consistent jitter based on event time and type
const getJitter = (time: number, type: string) => {
  let hash = 0;
  for (let i = 0; i < type.length; i++) {
    hash = ((hash << 5) - hash) + type.charCodeAt(i);
    hash |= 0;
  }
  return ((time * 9301 + hash * 49297) % 21) - 10; // -10 to 10px jitter
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

  const [hoveredEvent, setHoveredEvent] = useState<number | null>(null);

  const getEventPosition = (time: number): number => {
    return Math.max(0, Math.min((time / maxTime) * timelineWidth, timelineWidth - 1));
  };

  const currentTimePosition = getEventPosition(currentTime);
  
  // Group events by time for jitter calculation
  const timeGroups = new Map<number, number>();
  events.forEach(event => {
    const count = timeGroups.get(event.time) || 0;
    timeGroups.set(event.time, count + 1);
  });
  
  const getEventJitter = (event: SimulationEvent, index: number) => {
    const count = timeGroups.get(event.time) || 1;
    if (count <= 1) return 0;
    return getJitter(event.time, event.type) * (index % 3);
  };

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

          {/* Event markers */}
          <AnimatePresence>
            {events.map((event, index) => {
              const position = getEventPosition(event.time);
              const style = EVENT_STYLES[event.type] || EVENT_STYLES.ALLOCATION_ATTEMPT;
              const jitter = getEventJitter(event, index);
              const isHovered = hoveredEvent === index;

              const shapeClass = {
                circle: 'rounded-full',
                square: 'rounded-sm',
                triangle: 'w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent',
                diamond: 'rotate-45',
              }[style.shape];

              return (
                <motion.div
                  key={`${event.time}-${event.type}-${index}`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1,
                    y: jitter,
                  }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ 
                    duration: 0.3, 
                    delay: index * 0.01,
                    type: 'spring',
                    stiffness: 500,
                    damping: 30,
                  }}
                  className="absolute top-1/2 -translate-y-1/2 cursor-pointer z-10"
                  style={{ 
                    left: `${position}px`,
                    filter: isHovered ? 'drop-shadow(0 0 8px currentColor)' : 'none',
                  }}
                  onMouseEnter={() => setHoveredEvent(index)}
                  onMouseLeave={() => setHoveredEvent(null)}
                >
                  {/* Event marker */}
                  <div 
                    className={`flex items-center justify-center w-5 h-5 border-2 border-background transition-all duration-200 ${shapeClass} ${
                      isHovered ? 'scale-125' : ''
                    }`}
                    style={{
                      backgroundColor: isHovered ? style.color : `${style.color}80`,
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      textShadow: '0 0 4px rgba(0,0,0,0.5)',
                    }}
                  >
                    {style.icon}
                  </div>

                  {/* Custom tooltip */}
                  {isHovered && (
                    <motion.div 
                      className="absolute left-1/2 -translate-x-1/2 mb-2 px-2 py-1.5 text-xs bg-foreground/90 text-background rounded shadow-lg whitespace-nowrap z-50"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: -15 }}
                      exit={{ opacity: 0, y: -10 }}
                      style={{ top: '-0.5rem', transform: 'translate(-50%, -100%)' }}
                    >
                      <div className="font-bold">{event.type.replace('_', ' ')}</div>
                      {event.processName && (
                        <div className="font-mono">{event.processName}</div>
                      )}
                      <div className="text-muted opacity-80">{event.details}</div>
                      <div className="text-xs opacity-60 mt-1">t={event.time}</div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
            );
          })}

          {/* Current time cursor */}
          {currentTime >= 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute top-0 bottom-0 w-0.5"
              style={{ 
                left: `${currentTimePosition}px`,
                background: 'linear-gradient(to bottom, transparent, var(--primary) 20%, var(--primary) 80%, transparent)',
                boxShadow: '0 0 15px 2px var(--primary), 0 0 30px 5px var(--primary)',
              }}
            >
              {/* Cursor label with arrow */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <div className="relative px-2 py-1 bg-primary text-background text-xs font-mono rounded shadow-lg">
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rotate-45"></div>
                  <span className="relative z-10">t = {currentTime}</span>
                </div>
              </div>

              {/* Time band highlight */}
              <motion.div 
                className="absolute inset-x-0 h-full bg-primary/5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.1 }}
                transition={{ 
                  repeat: Infinity, 
                  repeatType: 'reverse',
                  duration: 1.5,
                  ease: 'easeInOut'
                }}
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Enhanced Legend */}
      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-border/50">
        {Object.entries(EVENT_STYLES).map(([type, style]) => {
          const label = type
            .split('_')
            .map(word => word.charAt(0) + word.slice(1).toLowerCase())
            .join(' ');
            
          return (
            <div key={type} className="flex items-center gap-2 group">
              <div 
                className={`w-3 h-3 flex items-center justify-center text-[8px] font-bold transition-transform group-hover:scale-125 ${
                  style.shape === 'diamond' ? 'rotate-45' : ''
                } ${style.shape === 'triangle' ? 'w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent' : ''}`}
                style={{
                  backgroundColor: style.shape === 'triangle' ? 'transparent' : `${style.color}80`,
                  borderBottomColor: style.shape === 'triangle' ? style.color : 'transparent',
                  color: 'white',
                }}
              >
                {style.shape !== 'triangle' && style.icon}
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

