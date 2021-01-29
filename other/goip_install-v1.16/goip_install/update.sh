#!/bin/sh

killall goipcron >/dev/null 2>/dev/null
sleep 0.5

echo "Copying file to /usr/local/goip"
cp -rf goip /usr/local/
chmod -R 777 /usr/local/goip

cd /usr/local/goip/
php ./update.php
sleep 0.5

./run_goipcron
echo "update done!"
