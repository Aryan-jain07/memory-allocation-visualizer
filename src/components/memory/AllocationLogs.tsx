import { motion, AnimatePresence } from 'framer-motion';
import { AllocationLog } from '@/types/memory';
import { Terminal, CheckCircle, XCircle, Info, ArrowRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AllocationLogsProps {
  logs: AllocationLog[];
}

export function AllocationLogs({ logs }: AllocationLogsProps) {
  const getLogIcon = (type: AllocationLog['type']) => {
    switch (type) {
      case 'allocation': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'deallocation': return <ArrowRight className="w-4 h-4 text-warning" />;
      case 'error': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'info': return <Info className="w-4 h-4 text-primary" />;
      case 'compaction': return <ArrowRight className="w-4 h-4 text-secondary" />;
      default: return <Info className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getLogColor = (type: AllocationLog['type']) => {
    switch (type) {
      case 'allocation': return 'text-success';
      case 'deallocation': return 'text-warning';
      case 'error': return 'text-destructive';
      case 'info': return 'text-primary';
      case 'compaction': return 'text-secondary';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-3 h-full"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded bg-success/20">
          <Terminal className="w-4 h-4 text-success" />
        </div>
        <h3 className="font-display text-sm text-success">KERNEL LOGS</h3>
      </div>

      <ScrollArea className="h-[200px] rounded bg-background/50 border border-border">
        <div className="p-2 space-y-1 font-mono text-xs">
          <AnimatePresence mode="popLayout">
            {logs.length === 0 ? (
              <div className="text-muted-foreground text-center py-4">
                <Terminal className="w-6 h-6 mx-auto mb-1 opacity-50" />
                <p className="text-xs">No logs yet...</p>
              </div>
            ) : (
              logs.map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-2 p-1 rounded hover:bg-muted/20 transition-colors"
                >
                  <div className="mt-0.5 shrink-0">{getLogIcon(log.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className={`font-medium ${getLogColor(log.type)}`}>
                        [{log.type.toUpperCase()}]
                      </span>
                      <span className="text-foreground truncate">{log.message}</span>
                    </div>
                    {log.details && (
                      <p className="text-[10px] text-muted-foreground">{log.details}</p>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </motion.div>
  );
}
