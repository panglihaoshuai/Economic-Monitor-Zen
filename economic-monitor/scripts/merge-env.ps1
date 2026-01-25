<# PowerShell script to merge .env and .env.server into a unified .env.unified file #>
param()

$envFiles = @("D:\\fed\\economic-monitor\\.env", "D:\\fed\\economic-monitor\\.env.server")
$all = @{}
foreach ($path in $envFiles) {
  if (Test-Path $path) {
    foreach ($line in Get-Content $path) {
      $line = $line.Trim()
      if ($line -eq '' -or $line.StartsWith('#')) { continue }
      if ($line -match '^(?<k>[A-Z0-9_]+)=(?<v>.*)$') {
        $k = $Matches['k']
        $v = $Matches['v']
        $all[$k] = $v
      }
    }
  }
}

$out = @()
foreach ($kv in $all.GetEnumerator() | Sort-Object Key) {
  $out += "$($kv.Key)=$($kv.Value)"
}

#$OUTPUT = 'D:\\fed\\economic-monitor\\.env.unified'
$out | Set-Content 'D:\\fed\\economic-monitor\\.env.unified'
Write-Host "Wrote D:\fed\economic-monitor\.env.unified"
