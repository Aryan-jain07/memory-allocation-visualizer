# Memory Allocation Algorithm Visualizer

An interactive web application to **visualize and understand memory allocation algorithms** used in operating systems.  
The project allows users to experiment with different input cases, observe how memory is allocated, and analyze fragmentation and utilization.

This tool is designed primarily for **educational and demonstration purposes**, especially for OS and DSA concepts.

---

## 🚀 Features

- 📊 Visual representation of memory blocks and holes
- 🧠 Simulation of memory allocation algorithms (e.g. First Fit, Best Fit, etc.)
- 📄 **Excel-based input/output**
  - Generate a random, well-structured demo case as an Excel file
  - Modify memory/process values externally
  - Upload the Excel file back to the app to run the simulation
- ❗ Strong input validation
  - Prevents running simulations with incomplete or invalid data
  - Blocking alert dialog for invalid Excel uploads
- 🔁 Re-runnable simulations with different configurations
- 🖥️ Clean, responsive UI built for clarity

---

## 🧩 Why Excel-based Inputs?

Instead of hardcoding inputs or using only form fields, this project supports Excel files to:

- Enable **reproducible test cases**
- Allow easy modification of inputs without touching code
- Make demonstrations clearer during presentations
- Encourage experimentation with different memory layouts

This approach closely mirrors how test data is handled in real-world systems and labs.

---

## 📁 Excel File Format

The uploaded Excel file must contain the following sheets:

### Sheet 1: `Processes`

| Process Name | Size |
|-------------|------|
| P1          | 120  |
| P2          | 60   |

**Rules:**
- If a process name is present, its size must be provided
- Size must be a positive number
- Duplicate process names are not allowed

---

### Sheet 2: `Memory`

| Key          | Value |
|-------------|-------|
| TotalMemory | 1000  |

---

### Sheet 3: `Holes`

| Hole ID | Start | Size |
|--------|-------|------|
| H1     | 0     | 200  |
| H2     | 300   | 150  |

---

## 🛠️ Tech Stack

- **Frontend:** React + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui + Radix UI
- **Excel Parsing:** SheetJS (`xlsx`)
- **Version Control:** Git & GitHub
- **Deployment:** Vercel

---

## 🧪 Running the Project Locally

### Prerequisites
- Node.js (v18 or later)
- npm

### Steps

```bash
git clone <repository-url>
cd lovable-export
npm install
npm run dev
