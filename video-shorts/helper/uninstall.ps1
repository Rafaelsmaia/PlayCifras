# Remove o ajudante de render PlayCifras (mantém os vídeos já gerados em Documentos\PlayCifras).
$ErrorActionPreference = 'Stop'

$dest = Join-Path $env:LOCALAPPDATA 'PlayCifras\render-helper'
$vbs = Join-Path ([Environment]::GetFolderPath('Startup')) 'PlayCifras Render.vbs'

Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object { $_.CommandLine -like '*render-helper*server.mjs*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

if (Test-Path $vbs) { Remove-Item $vbs -Force }
if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }

Write-Host 'Ajudante PlayCifras removido.' -ForegroundColor Green
