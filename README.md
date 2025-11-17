# Live Cast

A real-time screen sharing tool with two implementations: UDP (for local network) and WebSocket (for when UDP is blocked or unavailable, works on both local and broader networks).

## Overview

Live Cast enables low-latency screen sharing with adaptive quality control. It compresses each frame as a complete JPEG image and dynamically adjusts quality and frame rate based on network conditions.

## Versions

### UDP Version (`udp-version/`)

Optimized for local network broadcasting using UDP datagrams. Runs a Node.js server that uses system APIs to capture screen and mouse position.

**Features:**

- Broadcasts over local network using UDP/datagram
- Each frame compressed as complete JPEG (not diffed)
- Dynamic quality adjustment to fit datagram size limit (65KB)
- Supports partitioning (1-4 slices) for higher quality at lower FPS
- Benchmarked performance: 5-30 FPS depending on resolution

**Performance Benchmarks:**
| Resolution | Base FPS |
|------------|----------|
| 1920x1080 | 5 |
| 1280x720 | 6 |
| 1024x576 | 12 |
| 960x540 | 16 |
| 720x405 | 22 |
| 640x360 | 30 |

### WebSocket Version (`web-socket-version/`)

Used when UDP is not available or blocked. Works over local network and broader networks with WebSocket support. Uses browser APIs to capture screen.

**Features:**

- Adaptive frame rate control based on receiver FPS feedback
- JPEG compression with UI controlled quality (0.05-1.0)
- Real-time buffer management to prevent memory buildup
- Show status of sender and receivers' FPS and message size
- Buttons to toggle fullscreen and take snapshot

## Getting Started

### UDP Version

```bash
cd udp-version
pnpm install
# Run server
pnpm start
# Run client (in another terminal)
node run-client.js
```

### WebSocket Version

```bash
cd web-socket-version
pnpm install
pnpm build
# Start server
node dist/server.js
# Open http://localhost:8100 in browser
```

## Architecture

Both versions follow a similar architecture:

- **Sender**: Captures screen, compresses to JPEG, sends frames
- **Server**: Relays frames to subscribers (UDP broadcasts, WebSocket forwards)
- **Receiver**: Receives frames, decodes JPEG, displays on canvas

## Development

### Project Structure

```
live-cast/
├── udp-version/          # UDP-based implementation
│   ├── src/              # Server and client code
│   └── live-cast-client/ # Electron client
├── web-socket-version/   # WebSocket-based implementation
│   ├── src/              # TypeScript source
│   └── public/           # Static files and bundle
├── streaming/            # RTMP/RTP streaming scripts
└── test/                 # Test pages with color wheel, clock, and animation of a rotating box
```
