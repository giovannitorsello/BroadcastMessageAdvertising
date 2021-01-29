<?php

define("OK", true);
session_start();
if(!isset($_SESSION['usertype'])){
        require_once ('login.php');
        exit;
}
require_once("global.php");
if(isset($_GET['action'])) {
	//if($_GET['action'] != "modifyself" && $_GET['action'] != "savemodifyself" && $_COOKIE['adminname']!="admin" )
	//WriteErrMsg("<br><li>需要admin权限!</li>");
	$action=$_GET['action'];

	if($action=="netcheck"){
		$action="main";
		$sendbuf=my_pack2(DEV_NETCHECK, $_GET[line_name],TYPE_GOIP);
		if (($socket = socket_create(AF_INET, SOCK_DGRAM, SOL_UDP)) <= 0) {
			echo "socket_create() failed: reason: " . socket_strerror($socket) . "\n";
			exit;
		}
		$socks[]=$socket;
		//echo "s:$sendbuf,".strlen($sendbuf);
		if (socket_sendto($socket,$sendbuf, strlen($sendbuf), 0, "127.0.0.1", $phpsvrport)===false)
			echo ("sendto error");
		for($i=0;$i<2;$i++){
			$read=array($socket);
			$err=socket_select($read, $write = NULL, $except = NULL, 5);
			if($err>0){
				if(($n=@socket_recvfrom($socket,$buf,1024,0,$ip,$port))==false){
					//echo("recvform error".socket_strerror($ret)."<br>");
					continue;
				}
				else{
					if($buf==$sendbuf){
						$flag=1;
						break;
					}
				}
			}
		}
		if(!$flag)
			die("Mydify Success,but cannot get response from process named 'xchange' or 'scheduler'. please check process.");
		$timer=2;
		$timeout=7;
		for(;;){
			$read=$socks;
			flush();
			$err=socket_select($read, $write = NULL, $except = NULL, $timeout);
			if($err===false)
				echo "select error!";
			elseif($err==0){ //全体超时
				if(--$timer <= 0){
					echo "timeout!";
					break;
				}
			}
			else {
				if(($n=@socket_recvfrom($socket,$buf,1024,0,$ip,$port1))==false){
					//echo("recvform error".socket_strerror($ret)."<br>");
					continue;
				}
				$data=my_unpack_net_check($buf);
				$data[delay]=floor($data[delay])/1000;
				echo "<script language=\"javascript\">alert('测试网络 结果::\\n线路ID:$data[sid]\\nsent:$data[sent] recv:$data[recv] lost:$data[lost] bad:$data[bad] dup:$data[dup] daley:$data[delay]ms')</script>";
				break;
			}
		}
	}
	elseif($action=="modify")
	{
		$name=$_GET['name'];

		$query=$db->query("select * from sim_team order by sim_team_id ");
		while($row=$db->fetch_array($query)) {
			$prsdb[]=$row;
		}

		$rs=$db->fetch_array($db->query("SELECT * FROM device_line where line_name='$name'"));
		if($rs[dev_disable]) $ck2='selected';
		else $ck1='selected';

		$query=$db->query("select sim_name,plan_line_name from sim where sim_team_id='0' and (plan_line_name='0' or plan_line_name='$name')  order by sim_name");
		while($row=$db->fetch_array($query)) {
			$grsdb[]=$row;
		}
		//if(!$s[0])
		//WriteErrMsg("<br><li>添加用户需要admin权限</li>"."$row[1]");
	}
	elseif($action=="savemodify")
	{
		$password=$_POST['Password'];
		$name=$_POST['name'];
		$oldname=$_POST['oldname'];
		$team_id=$_POST['team_id'];
		$old_team_id=$_POST['old_team_id'];
		$id=$_GET['id'];
		$zone=$_POST['zone'];
		$oldzone = $_POST['old_zone'];
		$dev_disable = $_POST['dev_disable'];
		$sim_name=$_POST['sim_name'];
		//$name=$_POST['name'];
		//echo "$_POST[zone], $_PSOT[old_zone]<br>";
		$ErrMsg="";
		if($ErrMsg!="")
			WriteErrMsg($ErrMsg);
		else{
			$db->query("UPDATE device_line SET goip_team_id='$team_id',dev_disable='$dev_disable' WHERE line_name='$_POST[line_name]'");
			$db->query("UPDATE sim SET plan_line_name='0' WHERE plan_line_name='$_POST[line_name]'");
			$db->query("UPDATE sim SET plan_line_name='$_POST[line_name]' WHERE sim_name='$sim_name'");
			//echo "UPDATE sim SET plan_line_name='$_POST[line_name]' WHERE sim_name='$sim_name'";
			$query=$db->query("select device_line.*,password,zone from device_line left join rm_device on device_line.goip_name = rm_device.name where line_name='$_POST[line_name]'");
			while($row=$db->fetch_array($query)) {
				$send[]=my_pack($row, GOIP_ADD);
					if($dev_disable != $_POST['old_disable']){
						$send[]=my_pack2($row[dev_disable]?DEV_DISABLE:DEV_ENABLE, $row[line_name], TYPE_GOIP);
					}
                                }
				//sendto_xchanged($send);
			//unset($send);
			if(!$team_id)
				$send[]=my_pack2(DEV_BINDING, $sim_name, $_POST[line_name]);
			else {
				$send[]=my_pack2(DEV_BINDING, $_POST[old_plan_sim_name], 0);
			}
			sendto_xchanged($send);
			WriteSuccessMsg("<br><li>修改成功</li>","device_line.php?name=$_POST[goip_name]");
		}
	}
	else if($action=="reboot"){
		$send[]=my_pack2(MACHINE_REBOOT, $_GET['name'], TYPE_GOIP);
		sendto_xchanged($send);
		WriteSuccessMsg("<br><li>The commond is sended to goip($_GET[name]).</li>","device_line.php?name=$_GET[goip_name]");
	}
	else if($action=="reboot_module"){
		$send[]=my_pack2(MODULE_REBOOT, $_GET['name']);
		sendto_xchanged($send);
		WriteSuccessMsg("<br><li>The commond is sended to goip's module($_GET[name]).","device_line.php?name=$_GET[goip_name]");
	}
	else $action="main";

}
else $action="main";

//if($_COOKIE['adminname']=="admin")	
if($action=="main")
{
	if($_GET[name])
		$where="where goip_name='$_GET[name]'";
	$query=$db->query("SELECT count(*) AS count FROM device_line $where");
	$row=$db->fetch_array($query);
	$count=$row['count'];
	$numofpage=ceil($count/$perpage);
	$totlepage=$numofpage;
	if(isset($_GET['page'])) {
		$page=$_GET['page'];
	} else {
		$page=1;
	}
	if($numofpage && $page>$numofpage) {
		$page=$numofpage;
	}
	if($page > 1) {
		$start_limit=($page - 1)*$perpage;
	} else{
		$start_limit=0;
		$page=1;
	}
	$fenye=showpage("?",$page,$count,$perpage,true,true,"编");
	$query=$db->query("SELECT device_line.*,sim_team.*,sim.sim_name,zone,zone_tag,tag FROM device_line left join rm_device on device_line.goip_name = rm_device.name left join sim_team on device_line.goip_team_id=sim_team.sim_team_id left join sim on device_line.line_name=sim.line_name $where ORDER BY line_name  LIMIT $start_limit,$perpage");
	while($row=$db->fetch_array($query)) {
		if($row['line_status'] == 0 || $row['line_status'] == 12){
			$row['alive']='<font color="#FF0000">OFFLINE</font>';
		}
		elseif($row['line_status'] == 11){
			$row['alive']='<font color="#00FF00">ONLINE</font>';
		}
		elseif($row['line_status'] == 20){
			$row['alive']='<font color="#00FF00">IDLE</font>';
		}
		elseif($row['line_status'] == 21){
			$row['alive']="BUSY";
		}

		if($row['gsm_status'] == 0 || $row['gsm_status'] == 30){
			$row['gsm']='<font color="#FF0000">LOGOUT</font>';
		}
		else if($row['gsm_status'] == 31){
			$row['gsm']='<font color="#00FF00">LOGIN</font>';
		}

		if($row['dev_disable'] == 0){
			$row['disable'] = '<font color="#00FF00">Enable</font>';
		}
		else {
			$row['disable'] = '<font color="#FF0000">Disable</font>';
		}

		if($row['sleep'] == 0){
			$row['sleep'] = '<font color="#00FF00">Active</font>';
		}
		else {
			$row['sleep'] = '<font color="#FF0000">Sleeping</font>';
		}

		if($row['goip_team_id']){
			$row['bind_type'] = 'Group mode';
		}
		else {
			$row['bind_type'] = 'Fixed mode';
		}
		$rsdb[]=$row;
	}
}
require_once ('device_line.htm');

?>
