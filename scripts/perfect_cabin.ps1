Add-Type -AssemblyName System.Drawing

$srcPath = 'C:\Users\amazi\.gemini\antigravity\brain\0c15a112-46e2-4d42-8724-fcf8cd8d6120\.user_uploaded\media_1792762555441_f6c866b3.jpg'
$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $src.Width
$h = $src.Height

$cabin = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($cabin)
$g.DrawImage($src, 0, 0, $w, $h)

# 1. Full Windshield Cutout across the entire windshield width:
$windshieldPts = [System.Drawing.PointF[]]@(
    # Left A-pillar
    [System.Drawing.PointF]::new(98, 240),
    [System.Drawing.PointF]::new(112, 190),
    [System.Drawing.PointF]::new(145, 160),
    [System.Drawing.PointF]::new(200, 142),
    [System.Drawing.PointF]::new(300, 134),
    [System.Drawing.PointF]::new(450, 130),
    [System.Drawing.PointF]::new(600, 130),
    [System.Drawing.PointF]::new(740, 132),
    
    # Left edge of rearview mirror
    [System.Drawing.PointF]::new(746, 175),
    [System.Drawing.PointF]::new(748, 230),
    [System.Drawing.PointF]::new(755, 280),
    [System.Drawing.PointF]::new(775, 298),
    
    # Bottom edge of rearview mirror extending all the way to right screen border:
    [System.Drawing.PointF]::new(862, 305),
    [System.Drawing.PointF]::new(960, 310),
    [System.Drawing.PointF]::new(1024, 312),
    
    # Right border down to hood line
    [System.Drawing.PointF]::new(1024, 615),
    
    # Bottom hood line spanning all the way across
    [System.Drawing.PointF]::new(960, 615),
    [System.Drawing.PointF]::new(860, 616),
    [System.Drawing.PointF]::new(740, 616),
    [System.Drawing.PointF]::new(640, 618),
    [System.Drawing.PointF]::new(540, 620),
    [System.Drawing.PointF]::new(420, 622),
    [System.Drawing.PointF]::new(300, 622),
    [System.Drawing.PointF]::new(180, 620),
    [System.Drawing.PointF]::new(110, 618),
    
    # Left A-pillar lower section
    [System.Drawing.PointF]::new(96, 560),
    [System.Drawing.PointF]::new(88, 450),
    [System.Drawing.PointF]::new(86, 350),
    [System.Drawing.PointF]::new(90, 280)
)

$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddPolygon($windshieldPts)

$g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
$g.SetClip($path)
$g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
$g.ResetClip()

# Sky cutout above mirror (left of bracket)
$skyPocketPts = [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(740, 132),
    [System.Drawing.PointF]::new(895, 134),
    [System.Drawing.PointF]::new(895, 172),
    [System.Drawing.PointF]::new(746, 172)
)
$skyPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$skyPath.AddPolygon($skyPocketPts)
$g.SetClip($skyPath)
$g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
$g.ResetClip()

# 2. Perfect Inpainting of door panel and dashboard under steering wheel
$rand = New-Object System.Random(1337)

# A. Clean door panel (x: 55 to 220)
for ($y = 620; $y -lt 1024; $y++) {
    for ($x = 55; $x -lt 220; $x++) {
        # Check if this pixel had the hand/arm (R > 75 and G > 70) or glove
        $orig = $src.GetPixel($x, $y)
        $isArmOrGlove = ($orig.R -gt 70 -and $orig.G -gt 65) -or ($x -gt 100 -and $y -lt 950)
        if ($isArmOrGlove) {
            # Base color for door panel at this y
            if ($y -lt 730) {
                # Window sill
                $baseR = 56; $baseG = 58; $baseB = 55
            } else {
                # Vertical door panel gradient
                $t = ($y - 730) / (1024 - 730)
                $baseR = [int](44 - $t * 12)
                $baseG = [int](46 - $t * 12)
                $baseB = [int](43 - $t * 12)
            }
            $noise = $rand.Next(-2, 3)
            $r = [Math]::Min(255, [Math]::Max(0, ($baseR + $noise)))
            $gCol = [Math]::Min(255, [Math]::Max(0, ($baseG + $noise)))
            $b = [Math]::Min(255, [Math]::Max(0, ($baseB + $noise)))
            $cabin.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $r, $gCol, $b))
        }
    }
}

# Vertical seam line between door and dashboard at x = 218..220
for ($y = 620; $y -lt 1024; $y++) {
    $cabin.SetPixel(218, $y, [System.Drawing.Color]::FromArgb(255, 20, 22, 20))
    $cabin.SetPixel(219, $y, [System.Drawing.Color]::FromArgb(255, 30, 32, 29))
    $cabin.SetPixel(220, $y, [System.Drawing.Color]::FromArgb(255, 50, 52, 48))
}

# B. Mirror the right half of speedometer dial to left half (cx=395, cy=770, r=80)
$cx = 395
$cy = 770
for ($y = $cy - 85; $y -le $cy + 85; $y++) {
    for ($x = $cx - 85; $x -lt $cx; $x++) {
        $dx = $cx - $x
        $dy = $y - $cy
        $dist = [Math]::Sqrt($dx * $dx + $dy * $dy)
        if ($dist -le 82) {
            $mirrorX = $cx + $dx
            $c = $src.GetPixel($mirrorX, $y)
            $cabin.SetPixel($x, $y, $c)
        }
    }
}

# C. Clean dashboard metal under steering column and wheel hub (around cx=465, cy=875)
for ($y = 800; $y -lt 1024; $y++) {
    for ($x = 222; $x -lt 670; $x++) {
        $distSpeedo = [Math]::Sqrt(($x - 395) * ($x - 395) + ($y - 770) * ($y - 770))
        $distAux = [Math]::Sqrt(($x - 570) * ($x - 570) + ($y - 770) * ($y - 770))
        
        # Inpaint only the wheel rim, hub, and spokes
        $dxHub = ($x - 465) / 270.0
        $dyHub = ($y - 875) / 240.0
        $distWheel = [Math]::Sqrt($dxHub * $dxHub + $dyHub * $dyHub)
        $isWheel = ($distWheel -ge 0.86 -and $distWheel -le 1.05) -or ($distWheel -le 0.32) -or ([Math]::Abs($dyHub) -lt 0.12 -and $distWheel -le 0.9)
        
        if ($isWheel -and $distSpeedo -gt 82 -and $distAux -gt 82) {
            # Sample from the authentic metal panel texture on the right (x: 680..720)
            $srcX = 680 + ($x % 35)
            $srcY = 820 + ($y % 80)
            if ($srcY -ge 1024) { $srcY = 1000 }
            $c = $src.GetPixel($srcX, $srcY)
            $cabin.SetPixel($x, $y, $c)
        }
    }
}

# D. Clean wheel rim crossing over top cowl (y: 620..690)
for ($y = 620; $y -lt 690; $y++) {
    for ($x = 225; $x -lt 660; $x++) {
        $distSpeedo = [Math]::Sqrt(($x - 395) * ($x - 395) + ($y - 770) * ($y - 770))
        $distAux = [Math]::Sqrt(($x - 570) * ($x - 570) + ($y - 770) * ($y - 770))
        $dxHub = ($x - 465) / 270.0
        $dyHub = ($y - 875) / 240.0
        $distWheel = [Math]::Sqrt($dxHub * $dxHub + $dyHub * $dyHub)
        
        if ($distWheel -ge 0.86 -and $distWheel -le 1.05 -and $distSpeedo -gt 82 -and $distAux -gt 82) {
            # sample cowl metal from between dials (x: 480..500)
            $c = $src.GetPixel(485 + ($x % 15), $y)
            $cabin.SetPixel($x, $y, $c)
        }
    }
}

$g.Dispose()

$cabin.Save('d:\dev\games\hton\public\textures\cabin_ref.png', [System.Drawing.Imaging.ImageFormat]::Png)
$cabin.Dispose()
Write-Output "Clean cabin_ref.png perfected!"
