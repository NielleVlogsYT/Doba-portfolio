# Minimal static file server for local preview only.
# Serves the project folder on 127.0.0.1:8788 so index.html can load
# style.css, script.js and the files in res/ and images/.

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$port = 8788
$prefix = "http://127.0.0.1:$port/"

$mime = @{
    '.html'        = 'text/html; charset=utf-8'
    '.css'         = 'text/css; charset=utf-8'
    '.js'          = 'text/javascript; charset=utf-8'
    '.svg'         = 'image/svg+xml'
    '.png'         = 'image/png'
    '.ico'         = 'image/x-icon'
    '.webmanifest' = 'application/manifest+json'
    '.pdf'         = 'application/pdf'
    '.txt'         = 'text/plain; charset=utf-8'
}

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $port)
$listener.Start()
Write-Host "Serving $root at $prefix"

while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
        $client.ReceiveTimeout = 5000
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)

        $requestLine = $reader.ReadLine()
        while ($true) {
            $line = $reader.ReadLine()
            if ([string]::IsNullOrEmpty($line)) { break }
        }

        if ([string]::IsNullOrEmpty($requestLine)) { continue }

        $parts = $requestLine.Split(' ')
        $path = if ($parts.Length -ge 2) { $parts[1] } else { '/' }
        $path = $path.Split('?')[0]
        $rel = [Uri]::UnescapeDataString($path).TrimStart('/')
        if ([string]::IsNullOrEmpty($rel)) { $rel = 'index.html' }

        $full = [System.IO.Path]::GetFullPath((Join-Path $root $rel))

        if (-not $full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
            $status = 'HTTP/1.1 403 Forbidden'
            $body = [System.Text.Encoding]::UTF8.GetBytes('Forbidden')
            $type = 'text/plain; charset=utf-8'
        }
        elseif (Test-Path -LiteralPath $full -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($full)
            $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
            $type = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
            $status = 'HTTP/1.1 200 OK'
            $body = $bytes
        }
        else {
            $status = 'HTTP/1.1 404 Not Found'
            $body = [System.Text.Encoding]::UTF8.GetBytes("Not found: $rel")
            $type = 'text/plain; charset=utf-8'
        }

        $header = "$status`r`nContent-Type: $type`r`nContent-Length: $($body.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
        $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
        $stream.Write($headerBytes, 0, $headerBytes.Length)
        $stream.Write($body, 0, $body.Length)
        $stream.Flush()
    }
    catch {
        Write-Host "Error: $($_.Exception.Message)"
    }
    finally {
        if ($stream) { $stream.Dispose() }
        $client.Close()
    }
}
