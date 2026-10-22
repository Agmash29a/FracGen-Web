# Launch API and UI in separate terminal windows on Windows PowerShell.
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$root'; dotnet run --project .\backend\FracGen.Api\FracGen.Api.csproj --launch-profile FracGen.Api"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$root\frontend'; npm install; npm run dev"
Write-Host 'Open http://localhost:5173 after both development servers have started.'
