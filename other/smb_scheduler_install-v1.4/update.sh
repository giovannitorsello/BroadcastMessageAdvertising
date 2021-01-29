#!/bin/sh

killall smb_scheduler >/dev/null 2>/dev/null
killall xchanged >/dev/null 2>/dev/null
sleep 0.5

echo "Copying file to /usr/local/smb_scheduler"
cp -rf smb_scheduler /usr/local/
chmod -R 777 /usr/local/smb_scheduler

cd /usr/local/smb_scheduler/
./udata
php ./update.php
sleep 0.5

./run_scheduler
echo "update done!"
