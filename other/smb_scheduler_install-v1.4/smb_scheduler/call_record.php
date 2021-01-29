<?php
define("OK", true);
session_start();
if(!isset($_SESSION['usertype'])){
        require_once ('login.php');
        exit;
}
require_once("global.php");
$action=$_GET['action'];
if($action=="del"){
	$ErrMsg="";
	$Id=$_GET['id'];
	if(empty($Id)){
		$num=$_POST['boxs'];
		for($i=0;$i<$num;$i++)
		{	
			if(!empty($_POST["Id$i"])){
				if($Id=="")
					$Id=$_POST["Id$i"];
				else
					$Id=$_POST["Id$i"].",$Id";
			}
		}
	}

	if(empty($Id))
		$ErrMsg ='<br><li>Please choose one</li>';
	if($ErrMsg!="")
		WriteErrMsg($ErrMsg);
	else{
		$query=$db->query("DELETE FROM call_record WHERE id IN ($Id)");

		WriteSuccessMsg("<br><li>Delete call records success</li>","call_record.php?line_name=$_GET[line_name]&sim_name=$_GET[sim_name]");

	}
}
else if($action=="delall"){
	//if(empty($_GET[goipid]))                  
		//$ErrMsg ='<br><li>Please choose one</li>';
	if($ErrMsg!="")                                                                                           
		WriteErrMsg($ErrMsg);                                                                             
	else{ 
		if($_GET[line_name])  $where="where line_name='$_GET[line_name]'";
		else if($_GET[sim_name])  $where="where sim_name='$_GET[sim_name]'";
		$db->query("DELETE FROM call_record $where"); 

		WriteSuccessMsg("<br><li>Delete call records success</li>","call_record.php?line_name=$_GET[line_name]&sim_name=$_GET[sim_name]");

	}
}

	$t_info="全部";
	if($_GET[line_name])  {
		$where="where line_name='$_GET[line_name]'";
		$pages="line_name=$_GET[line_name]";
		$t_info="GoIP线路ID:$_GET[line_name]";
	}
	else if($_GET[sim_name])  {
		$where="where sim_name='$_GET[sim_name]'";
		$pages="sim_name=$_GET[sim_name]";
		$t_info="SIM Slot ID:$_GET[sim_name]";
	}
	$query=$db->query("SELECT count(*) AS count FROM call_record $where ");
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
	$fenye=showpage("?$pages&",$page,$count,$perpage,true,true,"编");
	$query=$db->query("SELECT * FROM call_record $where ORDER BY id DESC LIMIT $start_limit,$perpage");
	while($row=$db->fetch_array($query)) {
		if($row['dir']=="1")
			$row[dir1]='INCOMING';
		else if($row['dir']=="0")
			$row[dir1]='OUTGOING';
		else $row[dir1]='UNKNOWN';
		$rsdb[]=$row;
	}

?>
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<link href="style.css" rel="stylesheet" type="text/css">
<title>通话记录</title>
<script language="javascript">
function unselectall()
	{
	    if(document.myform.chkAll.checked){
		document.myform.chkAll.checked = document.myform.chkAll.checked&0;
	    } 	
	}

function CheckAll(form)
	{
		var trck;
		var e;
		for (var i=0;i<form.elements.length;i++)
	    {
		    e = form.elements[i];
		    if (e.type == 'checkbox' && e.id != "chkAll" && e.disabled==false){
				e.checked = form.chkAll.checked;
		 		do {e=e.parentNode} while (e.tagName!="TR") 
		 		if(form.chkAll.checked)
		 			e.className = 'even marked';
		 		else
		 			e.className = 'even';
			}
	    }
		//form.chkAll.classname = 'even';
	}

function mouseover(obj) {
                obj.className += ' hover';
				//alert(obj.className);
            	
			}

function mouseout(obj) {
            	obj.className = obj.className.replace( ' hover', '' );
				//alert(obj.className);
			}

function trclick(obj) {
		//alert("ddddd");
        var checkbox = obj.getElementsByTagName( 'input' )[0];
        //if ( checkbox && checkbox.type == 'checkbox' ) 
        checkbox.checked ^= 1;
		if(checkbox.checked)
			obj.className = 'even marked';
		else obj.className = 'even';
//		var ckpage=document.modifyform.elements['chkAll'+num];
	    if(document.myform.chkAll.checked){
		document.myform.chkAll.checked = document.myform.chkAll.checked&0;
	    } 	
		

		}

</script>
</head>
<body leftmargin="2" topmargin="0" marginwIdth="0" marginheight="0">
<table wIdth="100%" border="0" align="center" cellpadding="2" cellspacing="1" class="border">
  <tr class="topbg"> 
    <td height="22" colspan="2" align="center"><strong>通话记录</strong></td>
  </tr>
  <tr class="tdbg"> 
<td wIdth="70" height="30"><strong>导航:</strong></td>
    <td height="30"><a href="?line_name=<?php echo $_GET[line_name] ?>&sim_name=<?php echo $_GET[sim_name] ?>" target=main>刷新</a>&nbsp;|&nbsp;<a href="call_record.php" target=main>所有通话记录</a></td>
  </tr>
</table>
<table width="100%" height="25"  border="0" cellpadding="0" cellspacing="0">
  <tr class="topbg">
    <td width="8%">&nbsp;</td>
    <td width="92%" height="25"><strong>当前位置：(<?php echo $t_info ?>)通话记录</strong></td>
  </tr>
</table>
<form action="call_record.php?action=del&<?php echo "line_name=$_GET[line_name]&sim_name=$_GET[sim_name]" ?>" method=post name=myform onSubmit="return confirm('确认删除')">
<table wIdth="100%"  border="0" cellspacing="2" cellpadding="2">
	<tr class=title>
		<td wIdth="35" align=center height="25"><b>选择</b></td>
		<td align="center"><b>时间</b></td>
		<td align="center"><b>SIM Slot ID</b></td>
		<td align="center"><b>GoIP线路 ID</b></td>
                <td align="center"><b>IMEI</b></td>
                <td align="center"><b>IMSI</b></td>
                <td align="center"><b>ICCID</b></td>
		<td align="center"><b>通话时长(秒)</b></td>
		<td align="center"><b>类型</b></td>
		<td align="center"><b>通话号码</b></td>
                <td align="center"><b>Disconnect Cause</b></td>
		<td wIdth="80" align=center><b>操作</b></td>
	</tr>
<!--
<?php 
$j=0;
foreach($rsdb as $rs) {
print <<<EOT
-->
	<tr class="even" onMouseOver="mouseover(this)" onMouseOut="mouseout(this)" onMouseDown="trclick(this)">
		<td align=center wIdth="35"><input name="Id{$j}" type='checkbox' onClick="return false" value="{$rs['id']}"></td>
		<td align="center">{$rs['time']}</td>
		<td align="center">{$rs['sim_name']}</td>
		<td align="center">{$rs['line_name']}</td>
                <td align="center">{$rs['imei']}</td>
                <td align="center">{$rs['imsi']}</td>
                <td align="center">{$rs['iccid']}</td>
		<td align="center">{$rs['duration']}</td>
		<td align="center">{$rs['dir1']}</td>
		<td align="center">{$rs['number']}</td>
		<td align="center">{$rs['disconnect_cause']}</td>
				
		<td align=center wIdth="80"><a href="call_record.php?id={$rs['id']}&action=del&line_name={$_GET[line_name]}&sim_name={$_GET[sim_name]}" onClick="return confirm('确认删除?')">删除</a></td>
    </tr>

<!--
EOT;
$j++;
}
print <<<EOT
-->
</table>
<input type="hIdden" name="boxs" value="{$j}">
<table wIdth="100%"  border="0" cellspacing="2" cellpadding="2">


					<tr>
						<td height="30" ><input name="chkAll" type="checkbox" Id="chkAll" onclick=CheckAll(this.form) value="checkbox"> 
					  选择当前页<input name="submit" type='submit' value='删除所选'>
<input name="button" type='button' value='删除全部' onClick="if(confirm('确认删除所有日志?')) window.location='?action=delall&line_name=$_GET[line_name]&sim_name=$_GET[sim_name]'"></td>
					</tr>
					<tr>
						<td  align=center>{$fenye}</td>
					</tr>
</table>
<!--
EOT;
?>
-->
</form>

					  </td> 
					</tr>
</table>
				
</body>
</html>
