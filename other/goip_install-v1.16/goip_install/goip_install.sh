#!/bin/sh
export PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

echo ""
echo ""
echo "Starting GoIP SMS System install "
echo ""
echo ""

if id | grep root > /dev/null
then
        :
else
        echo "You must be root to install these tools."
        exit 1
fi

if [ ! -d goip ]
then
	echo "Please change goip_install directory "
	exit 1
fi

echo "Configure httpd config:"
echo "Enter the httpd config file PATH: (default: /etc/httpd/conf.d)"
echo "Defautl press Enter"
read HTTP_PATH
if [ "${HTTP_PATH}" = "" ] 
then
	HTTP_PATH="/etc/httpd/conf.d"
fi

if [ ! -d ${HTTP_PATH} ]
then
	echo "${HTTP_PATH} do not exist"
	exit 1
fi

echo ""
echo ""
echo "Import Goip Databases "
echo "Enter the Mysql root password if the password exist:"
read MYSQL_PW
if [ ${MYSQL_PW}1 = "1" ] 
then
	:
else
	 MY_PRA="-p${MYSQL_PW}"
fi

echo ""
echo ""
echo "Enter your Mysql PATH: (default: /usr/bin/mysql)"
echo "Defautl press Enter"
read MYSQL_PATH
if [ "${MYSQL_PATH}" = ""  ] 
then
	MYSQL_PATH="/usr/bin/mysql"
fi

${MYSQL_PATH} -u root $MY_PRA < goip/goipinit.sql

if [ $? = "0" ]
then
	:
else
	echo "Mysql Database error"	
	exit 1
fi


echo '
Alias /goip "/usr/local/goip"
<Directory "/usr/local/goip">
    Options FollowSymLinks Indexes MultiViews
    AllowOverride None
    Order allow,deny
    Allow from all
</Directory>
' > $HTTP_PATH/goip.conf
echo "Copying file to /usr/local/goip"
cp -r goip /usr/local/
chmod -R 777 /usr/local/goip

[ -f "/etc/conf.d/local.start" ] && local="/etc/conf.d/local.start";
[ -f "/etc/rc.d/rc.local" ] && local="/etc/rc.d/rc.local"
[ -f "/etc/rc.local" ] && local="/etc/rc.local"


rclocaltmp=`mktemp /tmp/rclocal.XXXXXXXXXX`

if grep -q "goip" $local
then
        sed /goip/d $local > $rclocaltmp
        cat $rclocaltmp > $local
        rm -f $rclocaltmp
fi

echo "/usr/local/goip/run_goipcron" >>$local
/usr/local/goip/run_goipcron

echo "Install finish."
echo "Please restart your httpd"
echo "GoIP manager URL: http://your_ip/goip"

