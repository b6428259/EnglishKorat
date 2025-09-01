# --- config ---
$PemPath         = "./EKLS.pem"
$Ec2User         = "ubuntu"
$Ec2Host         = "ec2-54-254-53-52.ap-southeast-1.compute.amazonaws.com"
$RdsHost         = "ekorat-db.c96wcau48ea0.ap-southeast-1.rds.amazonaws.com"
$LocalMySQLPort  = 3307
$LocalRedisPort  = 6380
$SshExe          = "ssh"
$PidFile         = ".ssh-tunnel.pid"
# ----------------

Write-Host "Starting SSH tunnel (MySQL:$LocalMySQLPort -> $RdsHost:3306, Redis:$LocalRedisPort -> localhost:6379) ..."

if (Test-Path $PidFile) {
  $existingPid = Get-Content $PidFile | Select-Object -First 1
  if ($existingPid) {
    try {
      $proc = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
      if ($proc) {
        Write-Host "Existing tunnel process ($existingPid) is running. Stopping it first..."
        Stop-Process -Id $existingPid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
      }
    } catch {}
  }
  Remove-Item $PidFile -ErrorAction SilentlyContinue
}

$L1 = ("{0}:{1}:3306" -f $LocalMySQLPort, $RdsHost)
$L2 = ("{0}:localhost:6379" -f $LocalRedisPort)

$sshArgs = @(
  "-i", $PemPath,
  "-N",
  "-L", $L1,
  "-L", $L2,
  "$Ec2User@$Ec2Host"
)

$sshProc = Start-Process -FilePath $SshExe -ArgumentList $sshArgs -NoNewWindow -PassThru
Start-Sleep -Seconds 2

if ($sshProc -and -not $sshProc.HasExited) {
  Set-Content -Path $PidFile -Value $sshProc.Id
  Write-Host "Tunnel up. PID: $($sshProc.Id). MySQL: 127.0.0.1:$LocalMySQLPort, Redis: 127.0.0.1:$LocalRedisPort"
  exit 0
} else {
  Write-Error "Failed to start SSH tunnel."
  exit 1
}
