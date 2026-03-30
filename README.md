# Docktainer 🐳

A modern, smooth, and lightweight Terminal UI for Docker container management, built with Node.js and Ink.

## Features

- **Zero Lag Navigation**: Optimized React-based engine for instant responsiveness.
- **Dracula Theme**: Eye-candy visual aesthetics out of the box.
- **Group by Compose**: Containers automatically grouped by Docker Compose project.
- **Real-time Stats**: Live CPU and Memory usage for running containers.
- **Full Docker Management**:
  - Containers: List, Start, Stop, Remove, Logs, Inspect
  - Images: List, Remove, Run new container
  - Networks: List, Remove
  - Volumes: List, Remove
  - Compose: Group management, Up/Down entire stack

## Requirements

- Node.js (v16 or later)
- Docker Engine
- ts-node

## Installation

### 1. Clone the repository
```bash
git clone https://github.com/your-repo/docktainer
cd docktainer
```

### 2. Install dependencies
```bash
npm install
```

### 3. Install as CLI (Optional)
```bash
# Copy script to /usr/local/bin
sudo cp docktainer /usr/local/bin/docktainer
sudo chmod +x /usr/local/bin/docktainer
```

Or add to PATH:
```bash
echo 'export PATH="$PATH:/path/to/docktainer"' >> ~/.bashrc
```

## Usage

```bash
docktainer
```

Or:
```bash
npx ts-node index.tsx
```

## Keybindings

### Navigation
- `↑/↓` : Navigate items
- `1-6` : Switch tabs (Containers/Images/Networks/Volumes/Logs/Compose)
- `j/k` : Scroll up/down

### Containers Tab
- `s` : Start container
- `x` : Stop container
- `r` : Remove container
- `1` : Status view
- `2` : Inspect view (JSON)

### Images Tab
- `n` : Run new container from image
- `r` : Remove image

### Networks/Volumes Tab
- `d` : Delete network/volume

### Compose Tab
- `u` : Start all containers in compose project
- `x` : Stop all containers in compose project

### General
- `q` : Quit application

## Tabs

1. **Containers** - List all containers with status, CPU/Memory stats
2. **Images** - List, remove images, run new container
3. **Networks** - List and remove networks
4. **Volumes** - List and remove volumes
5. **Logs** - View container logs
6. **Compose** - Grouped view by compose project, up/down entire stack

## License

MIT
