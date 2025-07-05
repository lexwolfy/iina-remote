# IINA Web Remote

A web-based remote control for IINA video player using IINA's plugin system with WebSocket communication.

## Overview

This project provides a simple, elegant interface matching IINA's design for controlling playback from any device on your local network. The remote includes essential playback controls, seek functionality, and subtitle management.

## 🌐 Quick Access

**Web Interface:** https://lexwolfy.github.io/iina-remote  
**Plugin Installation:** `lexwolfy/iina-remote-plugin` (in IINA)

## Project Structure

```
iina-remote/
├── plugin/                 # IINA plugin implementation
│   ├── src/               # Plugin TypeScript source
│   ├── dist/              # Built plugin files
│   └── Info.json          # Plugin metadata
├── web/                   # Web remote control interface
│   ├── src/               # Web app source code
│   ├── dist/              # Built web interface (GitHub Pages)
│   └── public/            # Static assets
└── docs/                  # Documentation
```

## Quick Start

### Prerequisites

- IINA 1.4.0 or later
- Node.js 18+ and npm
- macOS (required for IINA)

### Installation

1. **Install the plugin in IINA:**
   - Open IINA
   - Go to Preferences > Plugins
   - Click "+" and enter: `lexwolfy/iina-remote-plugin`
   - Or download the `.iinaplgz` file from [Releases](https://github.com/lexwolfy/iina-remote/releases)

2. **Access the web interface:**
   - Visit: **https://lexwolfy.github.io/iina-remote**
   - Or serve locally for development (see below)

### Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/lexwolfy/iina-remote.git
   cd iina-remote
   ```

2. Install dependencies:
   ```bash
   # Plugin dependencies
   cd plugin && npm install
   
   # Web interface dependencies  
   cd ../web && npm install
   ```

3. Start development:
   ```bash
   # Terminal 1: Plugin development
   cd plugin
   npm run dev
   npm run link  # Link to IINA for testing
   
   # Terminal 2: Web interface development
   cd web
   npm run dev   # Starts at http://localhost:3000
   ```

### Building for Production

```bash
# Build plugin
cd plugin && npm run build && npm run release

# Build web interface
cd web && npm run build
```

## Features

- ✅ **Playback Control**: Play, pause, seek, skip forward/backward
- ✅ **Progress Slider**: Visual seek control with real-time updates
- ✅ **Subtitle Management**: Switch between subtitle tracks
- ✅ **Mobile Optimized**: Touch-friendly interface for all devices
- ✅ **IINA Design**: Matches IINA's visual language and color scheme
- ✅ **Real-time Updates**: WebSocket communication for instant feedback
- ✅ **GitHub Pages**: Hosted web interface accessible anywhere

## Architecture

The project consists of two main components:

1. **IINA Plugin** (`plugin/`): TypeScript-based plugin that runs within IINA, providing WebSocket server and IINA API integration
2. **Web Interface** (`web/`): Modern web application hosted on GitHub Pages that connects to the plugin via WebSocket

## Distribution

- **Plugin Distribution**: Separate repository at `lexwolfy/iina-remote-plugin` (clean, auto-update enabled)
- **Web Interface**: Hosted on GitHub Pages at `https://lexwolfy.github.io/iina-remote`
- **Development**: This repository contains all source code and development tools

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- Check the [troubleshooting guide](docs/TROUBLESHOOTING.md)
- Review [implementation plan](docs/IMPLEMENTATION_PLAN.md)
- Open an issue for bugs or feature requests 