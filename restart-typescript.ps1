# Script to restart TypeScript Language Server and clear cache
Write-Host "Restarting TypeScript Language Server..." -ForegroundColor Green

# Clear TypeScript cache if exists
if (Test-Path "node_modules/.cache") {
    Remove-Item -Recurse -Force "node_modules/.cache"
    Write-Host "Cleared TypeScript cache" -ForegroundColor Yellow
}

# Clear .vscode cache if exists
if (Test-Path ".vscode") {
    Write-Host ".vscode folder found" -ForegroundColor Yellow
}

Write-Host "`nPlease restart VS Code/Cursor and run:" -ForegroundColor Cyan
Write-Host "  Ctrl + Shift + P -> TypeScript: Restart TS Server" -ForegroundColor White
Write-Host "`nOr simply close and reopen VS Code/Cursor" -ForegroundColor Cyan







