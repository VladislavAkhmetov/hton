Add-Type -AssemblyName System.Drawing

$srcPath = 'C:\Users\amazi\.gemini\antigravity\brain\0c15a112-46e2-4d42-8724-fcf8cd8d6120\.user_uploaded\media_1792762555441_f6c866b3.jpg'
$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $src.Width
$h = $src.Height

$cabin = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($cabin)
$g.DrawImage($src, 0, 0, $w, $h)

# 1. Full Windshield Cutout - completely removing the house on the right:
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
    
    # Bottom edge of rearview mirror going all the way to right border
    [System.Drawing.PointF]::new(862, 305),
    [System.Drawing.PointF]::new(960, 310),
    [System.Drawing.PointF]::new(1024, 312),
    
    # Right edge of windshield down to hood
    [System.Drawing.PointF]::new(1024, 615),
    
    # Bottom hood line spanning across
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

# Sky pocket above mirror
$skyPocketPts = [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(740, 132),
    [System.Drawing.PointF]::new(900, 134),
    [System.Drawing.PointF]::new(900, 172),
    [System.Drawing.PointF]::new(746, 172)
)
$skyPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$skyPath.AddPolygon($skyPocketPts)
$g.SetClip($skyPath)
$g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
$g.ResetClip()

# 2. Smart pixel-art inpainting for dashboard under wheel:
# A. Door panel: clone texture from x: 20..70 to x: 70..230
for ($y = 620; $y -lt 1024; $y++) {
    for ($x = 70; $x -lt 230; $x++) {
        # sample from left door area
        $srcX = 25 + ($x % 45)
        $c = $src.GetPixel($srcX, $y)
        $cabin.SetPixel($x, $y, $c)
    }
}

# B. Speedometer dial (cx=395, cy=770, r=80):
# Mirror the right unobstructed half of speedometer to the left half!
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

# C. Dashboard metal around steering column hub (cx=465, cy=875):
# Sample from authentic dashboard metal at x: 670..750
for ($y = 800; $y -lt 1024; $y++) {
    for ($x = 230; $x -lt 650; $x++) {
        # Check if this pixel is inside the dial areas:
        $distSpeedo = [Math]::Sqrt(($x - 395) * ($x - 395) + ($y - 770) * ($y - 770))
        $distAux = [Math]::Sqrt(($x - 570) * ($x - 570) + ($y - 770) * ($y - 770))
        if ($distSpeedo -gt 80 -and $distAux -gt 80) {
            # sample metal texture from right dashboard
            $srcX = 660 + ($x % 70)
            $srcY = 820 + ($y % 120)
            if ($srcY -ge 1024) { $srcY = 1000 }
            $c = $src.GetPixel($srcX, $srcY)
            $cabin.SetPixel($x, $y, $c)
        }
    }
}

# D. Upper rim of steering wheel (crossing above the dials between y: 620..700):
# Sample metal cowl from y: 640..700 at x: 480..520 (between dials)
for ($y = 620; $y -lt 695; $y++) {
    for ($x = 220; $x -lt 660; $x++) {
        $distSpeedo = [Math]::Sqrt(($x - 395) * ($x - 395) + ($y - 770) * ($y - 770))
        $distAux = [Math]::Sqrt(($x - 570) * ($x - 570) + ($y - 770) * ($y - 770))
        if ($distSpeedo -gt 80 -and $distAux -gt 80) {
            $c = $src.GetPixel(500 + ($x % 20), $y)
            $cabin.SetPixel($x, $y, $c)
        }
    }
}

$g.Dispose()

$cabin.Save('d:\dev\games\hton\public\textures\cabin_ref.png', [System.Drawing.Imaging.ImageFormat]::Png)
$cabin.Dispose()
Write-Output "Perfected cabin_ref.png with authentic pixel-art inpainting!"
