<div align="center">
  <img src="./public/vite.svg" width="120" height="120" alt="COGNAPSE Logo">
  <h1>C O G N A P S E</h1>
  <p><strong>Cognitive Network Analysis & Processing Synthesis Engine</strong></p>
  <p><i>A Sovereign Intelligence Terminal for the Digital Age.</i></p>
  <br />
</div>

## 🌐 Overview
**COGNAPSE** is a professional-grade, sovereign intelligence terminal designed to extract high-fidelity truth from global knowledge indexes. Built for operators who cannot afford data leaks or biased search algorithms, COGNAPSE is deployed as a **Native Electron Desktop Application** featuring Cloud-Hybrid Synthetic Intelligence. 

By seamlessly routing between ultra-fast cloud nodes and zero-configuration local **Ollama** hardware acceleration, COGNAPSE provides 100% private, uncensored, and unconstrained research capabilities.

---

## ✨ Features & Architecture

### 🚀 1. Cloud-Hybrid Architecture & Native Desktop
COGNAPSE escapes the limitations of the browser sandbox by running entirely on your local machine.
- **Native Electron Shell**: A highly optimized desktop wrapper providing native OS capabilities.
- **Auto-Booting Local AI (Ollama)**: Zero-configuration background integration. The system silently boots a local Llama instance upon launch to handle massive offline operations.
- **Groq LPU Acceleration**: Utilizes ultra-fast cloud nodes for standard, lightweight web crawling and synthesis, ensuring instantaneous results.

### 🧠 2. Intelligence & Research Modules
The core engine is built to replace standard search engines with structured, academic-grade synthesis.
- **Autonomous Discovery**: Parallel crawling of global knowledge indexes utilizing semantic clustering.
- **Deep Research Protocol**: When standard research isn't enough, the Deep Research engine takes over. Handled entirely by your local Ollama hardware, it generates massive (1,500+ word) academic-grade intelligence theses with total privacy.
- **Thought Replay Engine**: A forensic audit trail. The engine reverse-engineers the AI's internal process, visually playing back exactly how it identified sources, detected contradictions, and mitigated bias.
- **Tactical Intelligence Map**: Every research dossier is automatically mapped into an interactive, physics-based semantic node graph for non-linear exploration.

### 🎵 3. Interactive Environment & Visual Sonification
Intelligence you can feel. The dashboard is not just functional; it is a cinematic experience.
- **Spotify Sync**: Connect your Spotify account to sync your auditory environment with the dashboard.
- **Adaptive Canvas**: The background particle engine and color matrix automatically adapt to the tempo, rhythm, and bassline of your music.
- **Bimodal Aesthetics**: Perfect visual and cinematic fidelity maintained seamlessly across both **Dark (Night) Mode** and **Light (Normal) Mode**.

### 🛡️ 4. Security & Sovereign Storage
COGNAPSE is built for operators who prioritize data privacy and isolated intelligence gathering.
- **Sovereign Intelligence Vault**: Encrypted Firebase integration ensures your entire investigation history is persistent, globally accessible, and logically isolated from other users.
- **Cognitive Notebook**: A built-in operative scratchpad. Highlight any text within a report to instantly save it to your private SQLite-backed vault, preserving exact source attributions.

### 🏆 5. Operator Status & Gamification
Turn research into an ascending path of mastery.
- **Rank Progression**: Earn XP by executing high-level research. Ascend from *Novice* to *Omni-Observer*, unlocking higher tiers of system clearance.
- **Operative Dossier**: Instantly check your real-time stats, current rank, research streak, and total forensic dossiers compiled.

### ⚡ 6. Intelligence OS Navigation
A complete paradigm shift away from traditional web interfaces, designed for speed.
- **Universal Command Palette (⌘ + K)**: Instantly search your entire local and cloud-synced Research Archive directly from your keyboard, jumping straight into past investigations.
- **Tactical Rollup HUD**: A completely decluttered, zero-distraction layout where system modules roll out dynamically upon hovering the central system emblem.

---

## 💻 Requirements & Installation

COGNAPSE is built using **React**, **Vite**, **TypeScript**, and **Electron**. All package requirements are managed automatically via `npm`.

### Prerequisites
1. **Node.js** (v18 or higher)
2. **Git**
3. **Ollama** (Installed locally on your machine for the Deep Research Protocol)

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/COGNAPSE.git
   cd COGNAPSE
   ```

2. **Install Dependencies**
   Run the following command to download all required packages listed in the `package.json` file:
   ```bash
   npm install
   ```

3. **Environment Setup**
   Copy the example environment file and add your API keys:
   ```bash
   cp .env.example .env
   ```
   *Note: You will need to provide your Firebase config and optional Groq/Gemini API keys.*

---

## 🚀 Running the Application

### Development Mode
To run the application in development mode (which launches both the Vite React server and the Electron wrapper simultaneously):
```bash
npm run dev
```

### Build for Production (Desktop Installer)
To compile the application into a standalone native executable (`.exe` for Windows, `.dmg` for Mac) for distribution:
```bash
npm run build:desktop
```
The compiled installer will be output directly to the `release/` directory.

---

<div align="center">
  <p><i>"Extract objective truth from the noise of the digital age."</i></p>
  <p><b>Built with ❤️ by a Student Developer.</b></p>
</div>
