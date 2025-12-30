import * as XLSX from 'xlsx';

export interface ProcessTemplate {
  name: string;
  size: number;
}

export interface HoleTemplate {
  id: string;
  start: number;
  size: number;
}

export interface MemoryTemplate {
  totalMemory: number;
}

/**
 * Generates a random but valid demo case for memory allocation
 * and exports it as a downloadable .xlsx file
 */
export function generateTemplate(): void {
  // Generate random processes (3-6 processes)
  const numProcesses = Math.floor(Math.random() * 4) + 3;
  const processes: ProcessTemplate[] = [];
  const processNames = ['ProcessA', 'ProcessB', 'ProcessC', 'ProcessD', 'ProcessE', 'ProcessF'];
  
  for (let i = 0; i < numProcesses; i++) {
    processes.push({
      name: processNames[i],
      size: Math.floor(Math.random() * 200) + 50, // 50-250 KB
    });
  }

  // Generate total memory (should be larger than process sizes)
  const totalProcessSize = processes.reduce((sum, p) => sum + p.size, 0);
  const totalMemory = Math.max(512, Math.ceil(totalProcessSize * 1.5)); // At least 512 KB or 1.5x total process size

  // Generate random holes (2-4 holes)
  const numHoles = Math.floor(Math.random() * 3) + 2;
  const holes: HoleTemplate[] = [];
  const holeSize = Math.floor(totalMemory / (numHoles + 1));
  let currentStart = 0;

  // Ensure holes don't overlap and are valid
  for (let i = 0; i < numHoles; i++) {
    const holeId = `Hole${i + 1}`;
    const holeSizeValue = Math.floor(Math.random() * (holeSize * 0.8)) + Math.floor(holeSize * 0.2);
    const gap = Math.floor(Math.random() * 50) + 20; // Small gap between holes

    holes.push({
      id: holeId,
      start: currentStart,
      size: holeSizeValue,
    });

    currentStart += holeSizeValue + gap;
  }

  // Ensure holes don't exceed total memory
  const totalHoleSpace = holes.reduce((sum, h) => sum + h.size + (holes.indexOf(h) < holes.length - 1 ? 20 : 0), 0);
  if (totalHoleSpace > totalMemory) {
    // Scale down holes proportionally
    const scale = totalMemory / totalHoleSpace;
    holes.forEach(hole => {
      hole.size = Math.floor(hole.size * scale);
    });
  }

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Create Processes sheet
  const processesData = [
    ['Process Name', 'Size'], // Header
    ...processes.map(p => [p.name, p.size]),
  ];
  const processesSheet = XLSX.utils.aoa_to_sheet(processesData);
  XLSX.utils.book_append_sheet(workbook, processesSheet, 'Processes');

  // Create Memory sheet
  const memoryData = [
    ['TotalMemory'], // Header
    [totalMemory],
  ];
  const memorySheet = XLSX.utils.aoa_to_sheet(memoryData);
  XLSX.utils.book_append_sheet(workbook, memorySheet, 'Memory');

  // Create Holes sheet
  const holesData = [
    ['Hole ID', 'Start', 'Size'], // Header
    ...holes.map(h => [h.id, h.start, h.size]),
  ];
  const holesSheet = XLSX.utils.aoa_to_sheet(holesData);
  XLSX.utils.book_append_sheet(workbook, holesSheet, 'Holes');

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `memory-allocation-template-${timestamp}.xlsx`;

  // Write file
  XLSX.writeFile(workbook, filename);
}

