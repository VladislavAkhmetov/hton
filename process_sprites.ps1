Add-Type -AssemblyName System.Drawing

function Convert-Chroma([string]$inPath, [string]$outPath, [string]$mode) {
    Write-Output "Processing $inPath -> $outPath ($mode)..."
    $src = [System.Drawing.Bitmap]::FromFile($inPath)
    $w = $src.Width
    $h = $src.Height
    $dest = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            $col = $src.GetPixel($x, $y)
            $isTransparent = $false

            if ($mode -eq 'green') {
                # Windshield chroma green (upper 72% of image)
                if ($y -lt ($h * 0.72)) {
                    $g = [int]$col.G
                    $r = [int]$col.R
                    $b = [int]$col.B
                    if ($g -gt 120 -and ($g - $r) -gt 35 -and ($g - $b) -gt 35) {
                        $isTransparent = $true
                    }
                }
            } elseif ($mode -eq 'magenta') {
                # Magenta tree background
                $r = [int]$col.R
                $g = [int]$col.G
                $b = [int]$col.B
                if ($r -gt 120 -and $b -gt 120 -and ($r - $g) -gt 30 -and ($b - $g) -gt 30) {
                    $isTransparent = $true
                }
            }

            if ($isTransparent) {
                $dest.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
            } else {
                $dest.SetPixel($x, $y, $col)
            }
        }
    }

    $dest.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $src.Dispose()
    $dest.Dispose()
    Write-Output "Done: $outPath"
}

Convert-Chroma 'C:\Users\amazi\.gemini\antigravity\brain\0c15a112-46e2-4d42-8724-fcf8cd8d6120\uaz_bukhanka_cockpit_1792762069440.jpg' 'd:\dev\games\hton\public\textures\cabin_cockpit.png' 'green'
Convert-Chroma 'C:\Users\amazi\.gemini\antigravity\brain\0c15a112-46e2-4d42-8724-fcf8cd8d6120\birch_sprite_1792762074776.jpg' 'd:\dev\games\hton\public\textures\birch_sprite.png' 'magenta'
Convert-Chroma 'C:\Users\amazi\.gemini\antigravity\brain\0c15a112-46e2-4d42-8724-fcf8cd8d6120\spruce_sprite_1792762093094.jpg' 'd:\dev\games\hton\public\textures\spruce_sprite.png' 'magenta'
