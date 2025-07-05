# IINA Web Remote Plugin - Build Instructions

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+ and npm
- TypeScript knowledge

### Install Dependencies
```bash
cd plugin
npm install
```

## 🔨 Building the Plugin

### Development Build (with file watching)
```bash
npm run dev
```
This watches for TypeScript changes and rebuilds automatically.

### Production Build
```bash
npm run build
```
This creates a clean production build in the `dist/` folder.

### TypeScript Compilation Test
```bash
npm run test
```
Tests TypeScript compilation without building.

## 📦 Packaging for Transfer

### Create Transferable Package
```bash
npm run package
```

This creates `iina-web-remote.iinaplgz` file ready for transfer to another computer.

## 🚀 Installation on Target Computer

### Method 1: Direct Installation (Recommended)
1. Transfer `iina-web-remote.iinaplgz` to the target Mac
2. Double-click the `.iinaplgz` file
3. IINA will automatically install the plugin

### Method 2: Manual Installation
1. Transfer and extract `iina-web-remote.iinaplgz`
2. Rename the extracted folder to `iina-web-remote.iinaplugin`
3. Copy to `~/Library/Application Support/com.colliderli.iina/plugins/`
4. Restart IINA

## 🧪 Testing the Plugin

### After Installation
1. Open IINA
2. Go to **Window > Log Viewer** to see plugin messages
3. Look for "IINA Web Remote Plugin: Initialized successfully"
4. Load a video file
5. Check that WebSocket server starts on port 10010

### WebSocket Server Testing
- Server should start automatically when IINA loads
- Check log viewer for "WebSocket server started on port 10010"
- Test connection with a WebSocket client to `ws://localhost:10010`

### Expected Log Messages
```
IINA Web Remote Plugin: Initializing...
Setting up WebSocket server...
WebSocket server started on port 10010
WebSocket server state: ready
IINA Web Remote Plugin: Initialized successfully
Device name: [Your Mac Name]
```

## 🐛 Troubleshooting

### Build Issues
- **TypeScript errors**: Run `npm run test` to check compilation
- **Missing dependencies**: Run `npm install`
- **Parcel errors**: Delete `node_modules` and `.parcel-cache`, then `npm install`

### Plugin Not Loading
- Check IINA Log Viewer for error messages
- Verify plugin is in correct directory
- Ensure IINA version is 1.4.0+
- Check that macOS is 10.15+ (required for WebSocket server)

### WebSocket Server Issues
- **Port 10010 in use**: Change port in `src/index.ts`
- **Permission denied**: Ensure `network-request` permission in `Info.json`
- **Server failed to start**: Check IINA Log Viewer for specific errors

## 📁 Build Output Structure

After building, the `dist/` folder contains:
```
dist/
├── Info.json           # Plugin metadata
├── test.html          # Test interface
└── src/
    └── index.js       # Compiled TypeScript → JavaScript
```

## 🔧 Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Watch mode for development |
| `npm run build` | Production build |
| `npm run package` | Create transferable package |
| `npm run test` | Test TypeScript compilation |
| `npm run clean` | Clean build artifacts |
| `npm run link` | Link plugin for local development |
| `npm run unlink` | Remove development link |

## 🎯 Next Steps

1. Build the plugin: `npm run package`
2. Transfer `iina-web-remote.iinaplgz` to target Mac
3. Install by double-clicking the file
4. Test WebSocket server in IINA Log Viewer
5. Connect web interface to `ws://localhost:10010`

The plugin is now ready for testing with the web interface! 