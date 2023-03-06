## show available formats
# ffmpeg -muxers

ffmpeg \
	-video_size 1920x1080 \
	-framerate 1 \
	-f x11grab \
	-i :0.0+640,1123 \
	-rtbufsize 100M \
	-probesize 10M \
	-c:v libx264 \
	-preset ultrafast \
	-tune zerolatency \
	-pix_fmt yuv420p \
	-f flv \
	- \
	>output.flv

cat output.flv | ffplay
