$PidFile = ".ssh-tunnel.pid"

if (Test-Path $PidFile) {
  $tunnelPid = Get-Content $PidFile | Select-Object -First 1
  if ($tunnelPid) {
    try {
      $proc = Get-Process -Id $tunnelPid -ErrorAction SilentlyContinue
      if ($proc) {
        Write-Host "Stopping SSH tunnel PID $tunnelPid ..."
        Stop-Process -Id $tunnelPid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
      }
    } catch {}
  }
  Remove-Item $PidFile -ErrorAction SilentlyContinue
  Write-Host "Tunnel stopped."
} else {
  Write-Host "No tunnel PID file found."
}
