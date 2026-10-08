# Server local pentru aplicatia "Cabinet Stoica" (cabinetul de avocat Stoica Ioana).
# - serveste aplicatia la http://localhost:8766/ (My Rejust foloseste 8765, pot rula impreuna)
# - intermediaza cererile catre serviciul public portalquery.just.ro (dosare, termene, solutii)
# - deschide actele cu programul implicit (Word, Acrobat etc.)
# - salveaza zilnic o copie de siguranta in Documente\Cabinet Stoica\backup
# - la prima pornire pune pe Desktop iconita "Cabinet Stoica"
# Actualizare: in GitHub Desktop, Pull; la urmatoarea pornire se incarca versiunea noua.
# Oprire: inchideti aceasta fereastra.

param([int]$Port = 8766, [switch]$NoBrowser)

$ErrorActionPreference = 'Stop'
$root      = Split-Path -Parent $MyInvocation.MyCommand.Path
$origin    = "http://localhost:$Port"
$utf8      = New-Object System.Text.UTF8Encoding($false)
$docs      = [Environment]::GetFolderPath('MyDocuments')
# niciodata in folderul aplicatiei (care e legat de GitHub): fara Documente, folosim profilul utilizatorului
if (-not $docs) { $docs = if ($env:USERPROFILE) { $env:USERPROFILE } else { $HOME } }
$backupDir = Join-Path (Join-Path $docs 'Cabinet Stoica') 'backup'
$tmpActe   = Join-Path ([IO.Path]::GetTempPath()) 'cabinet-stoica-acte'
$portal    = if ($env:CABINET_PORTAL_URL) { $env:CABINET_PORTAL_URL } else { 'http://portalquery.just.ro/query.asmx' }
$allowed   = @('CautareDosare', 'CautareDosare2', 'CautareSedinte')
$peWindows = [Environment]::OSVersion.Platform -eq 'Win32NT'

# fisierele aplicatiei care pot fi servite (nimic din .git, electron, build etc.)
$mime = @{
    '.html' = 'text/html; charset=utf-8'; '.css' = 'text/css; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'
    '.mjs' = 'text/javascript; charset=utf-8'
    '.webmanifest' = 'application/manifest+json; charset=utf-8'; '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.ico' = 'image/x-icon'
}
$interzise = @('.git', '.github', 'electron', 'build', 'node_modules', 'dist')

function Send($ctx, [int]$code, [string]$type, [byte[]]$bytes) {
    $res = $ctx.Response
    $res.StatusCode = $code
    $res.ContentType = $type
    $res.Headers.Add('Cache-Control', 'no-store')
    $res.ContentLength64 = $bytes.Length
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
    $res.OutputStream.Close()
}
function SendText($ctx, [int]$code, [string]$type, [string]$text) { Send $ctx $code $type ($utf8.GetBytes($text)) }
function ReadBody($req) {
    $sr = New-Object System.IO.StreamReader($req.InputStream, $utf8)
    $body = $sr.ReadToEnd()
    $sr.Close()
    return $body
}

# Cererile care ies spre portal, deschid fisiere sau scriu pe disc trebuie sa vina din aplicatie
# (antet propriu + aceeasi origine), ca alte site-uri deschise sa nu le poata declansa.
function IsTrusted($req) {
    if ($req.Headers['X-App'] -ne 'cabinet') { return $false }
    $o = $req.Headers['Origin']
    return (-not $o) -or ($o -eq $origin)
}

function FisierStatic($path) {
    $rel = [Uri]::UnescapeDataString($path.TrimStart('/'))
    if (-not $rel) { $rel = 'index.html' }
    $prim = ($rel -split '[\\/]')[0]
    if ($interzise -contains $prim) { return $null }
    $full = [IO.Path]::GetFullPath((Join-Path $root $rel))
    $baza = [IO.Path]::GetFullPath($root).TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar
    if (-not $full.StartsWith($baza, [StringComparison]::OrdinalIgnoreCase)) { return $null }
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { return $null }
    if (-not $mime.ContainsKey([IO.Path]::GetExtension($full).ToLower())) { return $null }
    return $full
}

# Iconita "Cabinet Stoica" pe Desktop (doar daca nu exista deja)
function ScurtaturaDesktop {
    if (-not $peWindows) { return }
    try {
        $desk = [Environment]::GetFolderPath('Desktop')
        $lnk = Join-Path $desk 'Cabinet Stoica.lnk'
        if (Test-Path $lnk) { return }
        $sh = New-Object -ComObject WScript.Shell
        $s = $sh.CreateShortcut($lnk)
        $s.TargetPath = Join-Path $root 'Porneste.cmd'
        $s.WorkingDirectory = $root
        $s.IconLocation = (Join-Path $root 'build\icon.ico') + ',0'
        $s.WindowStyle = 7
        $s.Description = 'Cabinet de avocat Stoica Ioana'
        $s.Save()
        Write-Host '  Am pus pe Desktop iconita "Cabinet Stoica".' -ForegroundColor Green
    } catch { Write-Host ('  Nu am putut crea iconita de pe Desktop: ' + $_.Exception.Message) -ForegroundColor Yellow }
}

# Deschide aplicatia intr-o fereastra proprie (Edge sau Chrome, mod aplicatie); altfel in browserul implicit
function DeschideAplicatia {
    if ($NoBrowser) { return }
    $c = @()
    foreach ($b in @(${env:ProgramFiles(x86)}, $env:ProgramFiles, $env:LOCALAPPDATA)) {
        if ($b) { $c += Join-Path $b 'Microsoft\Edge\Application\msedge.exe'; $c += Join-Path $b 'Google\Chrome\Application\chrome.exe' }
    }
    $exe = $c | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($exe) { Start-Process -FilePath $exe -ArgumentList "--app=$origin/" }
    else { Start-Process "$origin/" }
}

# Versiunea acestui server: daca ruleaza deja aceeasi versiune, doar deschidem fereastra;
# daca ruleaza una mai veche (dupa Pull din GitHub), o oprim si pornim versiunea noua.
$versiune = [string](Get-Item $MyInvocation.MyCommand.Path).LastWriteTimeUtc.Ticks
try {
    $p = Invoke-WebRequest "$origin/api/ping" -UseBasicParsing -TimeoutSec 2
    if ($p.StatusCode -eq 200) {
        $vechi = $null
        try { $vechi = ($p.Content | ConvertFrom-Json).versiune } catch {}
        if ($vechi -eq $versiune) { DeschideAplicatia; exit }
        Write-Host '  Ruleaza o versiune mai veche a aplicatiei; o opresc si pornesc versiunea noua...' -ForegroundColor Yellow
        try { Invoke-WebRequest "$origin/api/oprire" -Method Post -Headers @{'X-App' = 'cabinet'} -UseBasicParsing -TimeoutSec 5 | Out-Null } catch {}
        $ocupat = { try { Invoke-WebRequest "$origin/api/ping" -UseBasicParsing -TimeoutSec 1 | Out-Null; $true } catch { $false } }
        for ($i = 0; $i -lt 20 -and (& $ocupat); $i++) { Start-Sleep -Milliseconds 250 }
        if (& $ocupat) {
            Write-Host '  Nu am putut opri versiunea veche. Inchideti fereastra neagra veche si porniti din nou.' -ForegroundColor Red
            exit 1
        }
    }
} catch {}

# copiile temporare ale actelor deschise se sterg la fiecare pornire (secret profesional)
if (Test-Path $tmpActe) { Remove-Item $tmpActe -Recurse -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Force $backupDir | Out-Null
ScurtaturaDesktop

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("$origin/")
$listener.Start()

Write-Host ''
Write-Host "  Cabinet Stoica ruleaza la $origin" -ForegroundColor Green
Write-Host "  Copiile de siguranta se salveaza in: $backupDir"
Write-Host '  Pentru oprire, inchideti aceasta fereastra.'
Write-Host ''
DeschideAplicatia

try {
    while ($listener.IsListening) {
        $ctx  = $listener.GetContext()
        $req  = $ctx.Request
        $path = $req.Url.AbsolutePath
        $verb = $req.HttpMethod
        try {
            if ($path -eq '/api/ping') {
                SendText $ctx 200 'application/json' (ConvertTo-Json -Compress -InputObject @{ok = $true; versiune = $versiune; backup = $backupDir})
            }
            elseif ($path -eq '/api/oprire' -and $verb -eq 'POST') {
                if (-not (IsTrusted $req)) { SendText $ctx 403 'text/plain' 'interzis'; continue }
                SendText $ctx 200 'application/json' '{"ok":true}'
                break
            }
            elseif ($path -eq '/api/soap' -and $verb -eq 'POST') {
                if (-not (IsTrusted $req)) { SendText $ctx 403 'text/plain' 'interzis'; continue }
                $action = $req.Headers['X-SOAPAction']
                if ($allowed -notcontains $action) { SendText $ctx 400 'text/plain' 'operatie nepermisa'; continue }
                $body = ReadBody $req
                $wc = New-Object System.Net.WebClient
                $wc.Encoding = $utf8
                $wc.Headers.Add('Content-Type', 'text/xml; charset=utf-8')
                $wc.Headers.Add('SOAPAction', "`"portalquery.just.ro/$action`"")
                try {
                    $resp = $wc.UploadString($portal, $body)
                    Write-Host ('  Portal: ' + $action + ' - raspuns primit') -ForegroundColor DarkGray
                    SendText $ctx 200 'text/xml; charset=utf-8' $resp
                } catch [System.Net.WebException] {
                    # raspunsul exact al portalului (de ex. 403), ca sa se vada in aplicatie si in aceasta fereastra
                    $cod = ''
                    if ($_.Exception.Response) { $cod = [string][int]$_.Exception.Response.StatusCode + ' ' + $_.Exception.Response.StatusDescription }
                    $msg = if ($cod) { "Portalul a raspuns cu eroarea $cod" } else { 'Portalul nu poate fi contactat: ' + $_.Exception.Message }
                    Write-Host ('  ' + $msg) -ForegroundColor Yellow
                    SendText $ctx 502 'text/plain; charset=utf-8' $msg
                }
            }
            elseif ($path -eq '/api/deschide' -and $verb -eq 'POST') {
                # deschide un act cu programul implicit, dintr-o copie temporara
                if (-not (IsTrusted $req)) { SendText $ctx 403 'text/plain' 'interzis'; continue }
                $nume = [IO.Path]::GetFileName([Uri]::UnescapeDataString([string]$req.Headers['X-Nume'])) -replace '[\\/:*?"<>|]', '_'
                if (-not $nume) { $nume = 'act' }
                $dir = Join-Path $tmpActe ([string](Get-Date).Ticks)
                New-Item -ItemType Directory -Force $dir | Out-Null
                $f = Join-Path $dir $nume
                $fs = [IO.File]::Create($f)
                try { $req.InputStream.CopyTo($fs) } finally { $fs.Close() }
                try { Start-Process -FilePath $f; SendText $ctx 200 'text/plain' '' }
                catch { SendText $ctx 200 'text/plain' ('Nu exista un program care sa deschida acest fisier: ' + $_.Exception.Message) }
            }
            elseif ($path -eq '/api/backup' -and $verb -eq 'POST') {
                # copia zilnica de siguranta (aceeasi forma ca "Descarca backup"); se pastreaza ultimele 30
                if (-not (IsTrusted $req)) { SendText $ctx 403 'text/plain' 'interzis'; continue }
                $f = Join-Path $backupDir ('cabinet-' + (Get-Date -Format 'yyyy-MM-dd') + '.json')
                $fs = [IO.File]::Create($f)
                try { $req.InputStream.CopyTo($fs) } finally { $fs.Close() }
                Get-ChildItem $backupDir -Filter 'cabinet-*.json' | Sort-Object Name -Descending | Select-Object -Skip 30 | Remove-Item -Force
                SendText $ctx 200 'application/json; charset=utf-8' (ConvertTo-Json -Compress -InputObject @{ok = $true; fisier = $f})
            }
            elseif ($verb -eq 'GET') {
                $f = FisierStatic $path
                if ($f) { Send $ctx 200 $mime[[IO.Path]::GetExtension($f).ToLower()] ([IO.File]::ReadAllBytes($f)) }
                else { SendText $ctx 404 'text/plain' 'negasit' }
            }
            else {
                SendText $ctx 404 'text/plain' 'negasit'
            }
        }
        catch {
            Write-Host ("  Eroare: " + $_.Exception.Message) -ForegroundColor Yellow
            try { SendText $ctx 500 'text/plain' $_.Exception.Message } catch {}
        }
    }
}
finally {
    $listener.Stop()
}
