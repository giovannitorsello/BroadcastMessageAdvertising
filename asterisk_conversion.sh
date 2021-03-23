SOX="/usr/bin/sox"
FFMPEG="/usr/bin/ffmpeg"

$FFMPEG -i $1 -ac 2 -f wav promo1.wav
$SOX  ./promo1.wav -t raw -r 8000  -c 1 ./promo1.sln