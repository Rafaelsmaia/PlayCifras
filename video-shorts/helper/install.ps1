# Instala o ajudante de render PlayCifras:
# copia para %LOCALAPPDATA%\PlayCifras\render-helper, instala dependências
# e registra para abrir escondido junto com o Windows.
# Rodar de novo atualiza a instalação.
$ErrorActionPreference = 'Stop'

$src = Split-Path -Parent $PSScriptRoot
$dest = Join-Path $env:LOCALAPPDATA 'PlayCifras\render-helper'
$server = Join-Path $dest 'helper\server.mjs'
$vbs = Join-Path ([Environment]::GetFolderPath('Startup')) 'PlayCifras Render.vbs'

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) {
  throw 'Node.js não encontrado. Instale o Node LTS (https://nodejs.org) e rode este script de novo.'
}

Write-Host 'Parando instância anterior (se houver)…'
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object { $_.CommandLine -like '*render-helper*server.mjs*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

Write-Host "Copiando arquivos para $dest…"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
robocopy $src $dest /MIR /XD node_modules out (Join-Path $src 'public\short') /XF helper.log /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "Falha ao copiar arquivos (robocopy $LASTEXITCODE)" }

Write-Host 'Instalando dependências (pode levar alguns minutos na 1ª vez)…'
Push-Location $dest
try {
  npm install --omit=dev --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw 'npm install falhou' }
} finally {
  Pop-Location
}

Write-Host 'Registrando para iniciar com o Windows…'
$cmd = '"' + $node + '" "' + $server + '"'
$line = 'CreateObject("WScript.Shell").Run "' + $cmd.Replace('"', '""') + '", 0, False'
Set-Content -Path $vbs -Value $line -Encoding Unicode

Write-Host 'Iniciando o ajudante…'
Start-Process wscript.exe -ArgumentList "`"$vbs`""

for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 1
  try {
    $h = Invoke-RestMethod 'http://127.0.0.1:3917/health' -TimeoutSec 2
    Write-Host ''
    Write-Host "Pronto! Ajudante rodando (v$($h.version)). Vídeos em: $($h.outDir)" -ForegroundColor Green
    Write-Host 'Na 1ª vez ele baixa o navegador do Remotion em segundo plano; o 1º render pode demorar um pouco mais.'
    exit 0
  } catch { }
}
Write-Warning "O ajudante não respondeu. Veja o log em $(Join-Path $dest 'helper\helper.log')"
exit 1
