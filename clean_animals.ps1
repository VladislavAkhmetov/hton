Add-Type -AssemblyName System.Drawing

function Clean-SpriteBorder([string]$path, [string]$outPath, [scriptblock]$isSubjectPixel) {
    $bmp = [System.Drawing.Bitmap]::FromFile($path)
    $w = $bmp.Width
    $h = $bmp.Height
    $visited = New-Object 'bool[,]' $w, $h
    $queue = New-Object System.Collections.Generic.Queue[System.Drawing.Point]

    # Seed all border pixels
    for ($x = 0; $x -lt $w; $x++) {
        $queue.Enqueue([System.Drawing.Point]::new($x, 0))
        $queue.Enqueue([System.Drawing.Point]::new($x, $h - 1))
        $visited[$x, 0] = $true
        $visited[$x, $h - 1] = $true
    }
    for ($y = 0; $y -lt $h; $y++) {
        $queue.Enqueue([System.Drawing.Point]::new(0, $y))
        $queue.Enqueue([System.Drawing.Point]::new($w - 1, $y))
        $visited[0, $y] = $true
        $visited[$w - 1, $y] = $true
    }

    # BFS Flood fill transparent background
    while ($queue.Count -gt 0) {
        $pt = $queue.Dequeue()
        $col = $bmp.GetPixel($pt.X, $pt.Y)

        $isSubject = & $isSubjectPixel $col $pt.X $pt.Y
        if (-not $isSubject) {
            $bmp.SetPixel($pt.X, $pt.Y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))

            # Check 4 neighbors
            $neighbors = @(
                [System.Drawing.Point]::new($pt.X + 1, $pt.Y),
                [System.Drawing.Point]::new($pt.X - 1, $pt.Y),
                [System.Drawing.Point]::new($pt.X, $pt.Y + 1),
                [System.Drawing.Point]::new($pt.X, $pt.Y - 1)
            )
            foreach ($n in $neighbors) {
                if ($n.X -ge 0 -and $n.X -lt $w -and $n.Y -ge 0 -and $n.Y -lt $h) {
                    if (-not $visited[$n.X, $n.Y]) {
                        $visited[$n.X, $n.Y] = $true
                        $queue.Enqueue($n)
                    }
                }
            }
        }
    }

    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Cleaned $outPath"
}

# 1. Clean Dog
Clean-SpriteBorder 'd:\dev\games\hton\public\textures\dog_sprite.png' 'd:\dev\games\hton\public\textures\dog_sprite.png' {
    param($c, $x, $y)
    # Dog is warm brown: R > 75, R > G + 10, R > B + 20
    return ($c.R -gt 70 -and $c.R -gt ($c.G + 8) -and $c.R -gt ($c.B + 16))
}

# 2. Clean Cow
Clean-SpriteBorder 'd:\dev\games\hton\public\textures\cow_sprite.png' 'd:\dev\games\hton\public\textures\cow_sprite.png' {
    param($c, $x, $y)
    # Cow has brown patches and white patches
    $isBrown = ($c.R -gt 85 -and $c.R -gt ($c.G + 15) -and $c.R -gt ($c.B + 20))
    $isWhite = ($c.R -gt 170 -and $c.G -gt 170 -and $c.B -gt 165)
    return ($isBrown -or $isWhite)
}
