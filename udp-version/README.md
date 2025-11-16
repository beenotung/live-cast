# live-cast

live-cast is a simple screen sharing tool using udp/datagram to broadcast over local network.

Each frame is compressed as complete jpeg (not diffed).

The quality is dynamically adjusted to fit datagram size limit (65k).

The quality can be increased when using partition (support 1-4 slices) but the fps will drop.

## Benchmark

Below is the fps measured on the same device:

| resolution | base fps |
| ---------- | -------- |
| 1920x1080  | 5        |
| 1280x720   | 6        |
| 1024x576   | 12       |
| 960x540    | 16       |
| 720x405    | 22       |
| 640x360    | 30       |
