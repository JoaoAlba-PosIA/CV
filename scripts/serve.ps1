$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$port = 4173
$prefix = "http://127.0.0.1:$port/"

function Test-LocalPort {
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $client.Connect("127.0.0.1", $port)
    $client.Close()
    return $true
  } catch {
    return $false
  }
}

if (Test-LocalPort) {
  Write-Output "Serving $root at $prefix"
  exit 0
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
try {
  $listener.Start()
} catch {
  Write-Output "Serving $root at $prefix"
  exit 0
}

Write-Output "Serving $root at $prefix"

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.LocalPath.TrimStart("/"))
    if ([string]::IsNullOrWhiteSpace($rel)) { $rel = "index.html" }
    $path = Join-Path $root ($rel -replace "/", [IO.Path]::DirectorySeparatorChar)

    $fullRoot = [IO.Path]::GetFullPath($root)
    $fullPath = [IO.Path]::GetFullPath($path)
    if (-not $fullPath.StartsWith($fullRoot, [StringComparison]::OrdinalIgnoreCase)) {
      $ctx.Response.StatusCode = 403
      $ctx.Response.Close()
      continue
    }

    if (Test-Path $fullPath -PathType Container) {
      $fullPath = Join-Path $fullPath "index.html"
    }

    if (Test-Path $fullPath -PathType Leaf) {
      $bytes = [IO.File]::ReadAllBytes($fullPath)
      $ext = [IO.Path]::GetExtension($fullPath).ToLower()
      $type = switch ($ext) {
        ".html" { "text/html; charset=utf-8" }
        ".css" { "text/css; charset=utf-8" }
        ".js" { "application/javascript; charset=utf-8" }
        ".jpg" { "image/jpeg" }
        ".jpeg" { "image/jpeg" }
        ".png" { "image/png" }
        ".webp" { "image/webp" }
        ".svg" { "image/svg+xml" }
        default { "application/octet-stream" }
      }
      $ctx.Response.Headers.Add("Cache-Control", "no-cache")
      $ctx.Response.ContentType = $type
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
    }
    $ctx.Response.Close()
  } catch {
    continue
  }
}
