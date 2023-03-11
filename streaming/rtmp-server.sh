ffmpeg \
	-re \
	-f x11grab \
	-i :0.0+0,0 \
	-c:v libx264 \
	-preset ultrafast \
	-crf 20 \
	-tune zerolatency \
	-pix_fmt yuv420p \
	-f flv \
	rtmp://192.168.80.105:1935/live/yolo
