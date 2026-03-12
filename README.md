# Docktainer 🐳

A modern, smooth, and lightweight Terminal UI for Docker container management, built with Node.js and Ink.

## Features

- **Zero Lag Navigation**: Optimized React-based engine for instant responsiveness.
- **Dracula Theme**: Eye-candy visual aesthetics out of the box.
- **Dual Tab View**:
  - **Status Tab**: Real-time operational data including live uptime and port mappings.
  - **Inspect Tab**: Scrollable JSON configuration with syntax highlighting.
- **Container Control**: Start and Stop containers directly from the UI.
- **Minimalist Design**: Unified borders and a clean footer-based identity.
- **Full Screen**: Automatically adapts to your terminal dimensions.

## Requirements

- Node.js (v16 or later)
- Docker Engine

## Installation

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd docktainer
```

### 2. Install dependencies
```bash
npm install
```

### 3. Install as CLI (Optional but Recommended)
To use the `docktainer` command globally on your system:
```bash
sudo npm link
```

## Usage

If you used `npm link`, simply run:
```bash
docktainer
```

Otherwise, you can run it using:
```bash
npx tsx index.tsx
```

## Keybindings

- `↑/↓` : Navigate containers
- `1 / 2` : Switch between Status and Inspect tabs
- `j / k` : Scroll up/down in current view
- `s` : Start container
- `x` : Stop/Kill container
- `q` : Quit application

## License

MIT
