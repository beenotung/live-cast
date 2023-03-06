ffmpeg \
	-video_size 1920x1080 \
	-framerate 12 \
	-f x11grab \
	-i :0.0+640,1123 \
	-rtbufsize 100M \
	-probesize 10M \
	-c:v libx264 \
	-preset ultrafast \
	-crf 20 \
	-tune zerolatency \
	-pix_fmt yuv420p \
	-threads 4 \
	-f mpegts \
	udp://0.0.0.0:1234
