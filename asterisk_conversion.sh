SOX="/usr/bin/sox"
FFMPEG="/usr/bin/ffmpeg"
filename=`echo "$1" | cut -d'.' -f1`
$FFMPEG -i $1 -ac 2 -f wav $filename.wav
$SOX  ./promo1.wav -t raw -r 8000  -c 1 ./$filename.sln