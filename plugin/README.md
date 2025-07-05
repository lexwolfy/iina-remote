# IINA Web Remote Plugin

A plugin for IINA that demonstrates proper usage of the IINA Plugin API.

## 🚨 **Important Update**

**The original implementation has been corrected** to only use documented IINA APIs. The previous version attempted to use WebSocket and HTTP server functionality that **does not exist** in IINA's plugin system.

## 📋 **What IINA Actually Supports**

According to the official IINA documentation:

✅ **Available APIs:**
- `iina.ws`: Create WebSocket **connections** (client-side only)
- `iina.http`: Make HTTP **requests** (client-side only)
- `iina.core`: Control player, show OSD messages
- `iina.mpv`: Access mpv properties and commands
- `iina.event`: Listen to IINA/mpv events
- `iina.utils`: Execute shell commands, show dialogs

❌ **NOT Available:**
- WebSocket server creation (`ws.createServer()`)
- HTTP server creation (`http.createServer()`)
- Server-side network functionality

## 🛠 **Current Implementation**

This corrected plugin now:

- ✅ Uses only documented IINA APIs
- ✅ Properly handles IINA events
- ✅ Demonstrates correct mpv property access
- ✅ Includes required permissions in `Info.json`
- ✅ Should load without installation errors

### Features Implemented

- **Event Logging**: Listens to playback events and logs status
- **Status Monitoring**: Tracks play/pause state, time position, media info
- **OSD Messages**: Shows plugin status via IINA's OSD
- **Device Identification**: Gets computer name using shell commands

## 🔧 **Installation**

1. **Install dependencies:**
   ```bash
   cd plugin
   npm install
   ```

2. **Link plugin to IINA:**
   ```bash
   npm run link
   ```

3. **Start IINA** and check the Log Viewer (Window > Log Viewer) for plugin logs

## 🧪 **Testing**

1. Ensure IINA is running with the plugin loaded
2. Open a video file in IINA
3. Check the IINA Log Viewer for plugin messages:
   - Plugin initialization
   - Event handling (file loaded, play/pause)
   - Status updates every 5 seconds

### Expected Log Output

```
IINA Web Remote Plugin: Initializing...
Setting up event listeners...
Event listeners set up successfully
IINA Web Remote Plugin: Initialized successfully
Device name: [Your Computer Name]
File loaded
Current Status: {
  "paused": false,
  "timePos": 0,
  "duration": 3600,
  "filename": "movie.mp4",
  "title": "Movie Title",
  "hasMedia": true
}
```

## 📄 **Info.json Structure**

The corrected `Info.json` includes:

```json
{
  "name": "IINA Web Remote",
  "version": "1.0.0",
  "identifier": "com.iina.webremote",
  "entry": "main.js",
  "permissions": [
    "network-request",
    "show-osd", 
    "file-system"
  ]
}
```

### Required Permissions

- `show-osd`: For displaying OSD messages
- `file-system`: For executing shell commands (`utils.exec()`)
- `network-request`: For future HTTP/WebSocket client functionality

## 🔍 **Why the Original Approach Won't Work**

The IINA Plugin API documentation clearly states:

- **`iina.ws`**: "create WebSocket **connections**" (not servers)
- **`iina.http`**: "make HTTP **requests**" (not servers)

IINA plugins run within the IINA process and cannot create network servers. For remote control functionality, you would need:

1. **External server**: A separate Node.js/Python server
2. **Plugin as client**: IINA plugin connects to external server
3. **Web interface**: Connects to the same external server
4. **Communication**: Server relays commands between web interface and IINA plugin

## 🐛 **Debugging**

### IINA Log Viewer
1. Open IINA
2. Go to Window > Log Viewer  
3. Look for "IINA Web Remote Plugin" messages
4. Verify initialization and event handling

### Common Issues

**Plugin not loading:**
- Check Info.json syntax (use JSON validator)
- Verify all permissions are correct
- Ensure main.js has no syntax errors
- Restart IINA after changes

**No log messages:**
- Verify plugin is properly linked/installed
- Check IINA version compatibility
- Ensure no JavaScript syntax errors

## 📄 License

MIT License - see the main project LICENSE file for details. 