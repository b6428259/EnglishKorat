# --- config ---
$PemPath         = "./EKLS.pem"
$Ec2User         = "ubuntu"
$Ec2Host         = "ec2-54-254-53-52.ap-southeast-1.compute.amazonaws.com"
$RdsHost         = "ekorat-db.c96wcau48ea0.ap-southeast-1.rds.amazonaws.com"
$LocalMySQLPort  = 3307
$LocalRedisPort  = 6380
$SshExe          = "ssh"
# ----------------

Write-Host "Starting SSH tunnel..."

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
Write-Host "Tunnel up. MySQL: 127.0.0.1:$LocalMySQLPort, Redis: 127.0.0.1:$LocalRedisPort"
Write-Host "Starting: npm run dev (press Ctrl+C to stop)"

try {
  npm run dev
  # npm test
  if ($LASTEXITCODE -eq 0) {
    npm run dev
  } else {
    Write-Host "npm test failed. Aborting dev server."
  }
}
finally {
  Write-Host "Stopping SSH tunnel..."
  if ($sshProc -and -not $sshProc.HasExited) {
    Stop-Process -Id $sshProc.Id -Force
  }
  Write-Host "Done."
}
