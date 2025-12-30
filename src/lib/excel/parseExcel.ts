import * as XLSX from 'xlsx';

export interface ProcessData {
  name: string;
  size: number;
}

export interface HoleData {
  id: string;
  start: number;
  size: number;
}

export interface ParsedExcelData {
  processes: ProcessData[];
  totalMemory: number;
  holes: HoleData[];
}

export class ExcelParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExcelParseError';
  }
}

/**
 * Parses an uploaded .xlsx file and validates the data
 * @param file - The Excel file to parse
 * @returns Structured data usable by a memory allocation simulator
 * @throws ExcelParseError if validation fails
 */
export async function parseExcel(file: File): Promise<ParsedExcelData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Parse Processes sheet
        const processesSheet = workbook.Sheets['Processes'];
        if (!processesSheet) {
          throw new ExcelParseError('Processes sheet not found');
        }
        const processesData = XLSX.utils.sheet_to_json<{ 'Process Name': string | number; 'Size': string | number }>(processesSheet, {
          defval: null,
        });

        // Parse Memory sheet
        const memorySheet = workbook.Sheets['Memory'];
        if (!memorySheet) {
          throw new ExcelParseError('Memory sheet not found');
        }
        const memoryData = XLSX.utils.sheet_to_json<{ TotalMemory: string | number }>(memorySheet, {
          defval: null,
        });

        // Parse Holes sheet
        const holesSheet = workbook.Sheets['Holes'];
        if (!holesSheet) {
          throw new ExcelParseError('Holes sheet not found');
        }
        const holesData = XLSX.utils.sheet_to_json<{ 'Hole ID': string | number; 'Start': string | number; 'Size': string | number }>(holesSheet, {
          defval: null,
        });

        // Validate processes
        const processes: ProcessData[] = [];
        const processNames = new Set<string>();

        for (const row of processesData) {
          const processName = row['Process Name'];
          const size = row['Size'];

          // Skip header row or empty rows
          if (processName === null || processName === undefined || processName === '') {
            continue;
          }

          // Skip if it's the header row (checking if it matches the header text)
          if (String(processName).trim().toLowerCase() === 'process name') {
            continue;
          }

          // Validate: If Process Name exists but Size is missing → throw error
          if (size === null || size === undefined || size === '') {
            throw new ExcelParseError(`Process "${processName}" has a name but Size is missing`);
          }

          // Validate: Size must be a positive number
          const sizeNum = typeof size === 'number' ? size : Number(size);
          if (isNaN(sizeNum) || sizeNum <= 0) {
            throw new ExcelParseError(`Process "${processName}" has invalid Size: must be a positive number`);
          }

          const processNameStr = String(processName).trim();

          // Validate: No duplicate process names
          if (processNames.has(processNameStr)) {
            throw new ExcelParseError(`Duplicate process name found: "${processNameStr}"`);
          }

          processNames.add(processNameStr);
          processes.push({
            name: processNameStr,
            size: sizeNum,
          });
        }

        // Validate memory
        if (memoryData.length === 0) {
          throw new ExcelParseError('Memory sheet is empty');
        }
        
        // Find the first non-header row
        let totalMemory: string | number | null = null;
        for (const row of memoryData) {
          const value = row.TotalMemory;
          // Skip header row
          if (value !== null && String(value).trim().toLowerCase() !== 'totalmemory') {
            totalMemory = value;
            break;
          }
        }

        if (totalMemory === null || totalMemory === undefined) {
          throw new ExcelParseError('TotalMemory is missing in Memory sheet');
        }
        const totalMemoryNum = typeof totalMemory === 'number' ? totalMemory : Number(totalMemory);
        if (isNaN(totalMemoryNum) || totalMemoryNum <= 0) {
          throw new ExcelParseError('TotalMemory must be a positive number');
        }

        // Validate holes
        const holes: HoleData[] = [];
        for (const row of holesData) {
          const holeId = row['Hole ID'];
          const start = row['Start'];
          const size = row['Size'];

          // Skip empty rows or header row
          if (holeId === null || holeId === undefined || holeId === '') {
            continue;
          }

          // Skip if it's the header row
          if (String(holeId).trim().toLowerCase() === 'hole id') {
            continue;
          }

          if (start === null || start === undefined || start === '') {
            throw new ExcelParseError(`Hole "${holeId}" has a Hole ID but Start is missing`);
          }

          if (size === null || size === undefined || size === '') {
            throw new ExcelParseError(`Hole "${holeId}" has a Hole ID but Size is missing`);
          }

          const startNum = typeof start === 'number' ? start : Number(start);
          const sizeNum = typeof size === 'number' ? size : Number(size);

          if (isNaN(startNum) || startNum < 0) {
            throw new ExcelParseError(`Hole "${holeId}" has invalid Start: must be a non-negative number`);
          }

          if (isNaN(sizeNum) || sizeNum <= 0) {
            throw new ExcelParseError(`Hole "${holeId}" has invalid Size: must be a positive number`);
          }

          holes.push({
            id: String(holeId).trim(),
            start: startNum,
            size: sizeNum,
          });
        }

        resolve({
          processes,
          totalMemory: totalMemoryNum,
          holes,
        });
      } catch (error) {
        if (error instanceof ExcelParseError) {
          reject(error);
        } else {
          reject(new ExcelParseError(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      }
    };

    reader.onerror = () => {
      reject(new ExcelParseError('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

