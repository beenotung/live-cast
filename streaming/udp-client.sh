ffmpeg \
	-i "udp://192.168.80.104:8234?overrun_nonfatal=1&fifo_size=100000000" \
	-f yuv4mpegpipe \
	- |
	ffplay -
