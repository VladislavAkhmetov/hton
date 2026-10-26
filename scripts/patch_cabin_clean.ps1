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

# 2. Inpaint clean dashboard under steering wheel & glove
# A. Door panel behind glove (x: 70..230, y: 620..1024):
# Sample smooth door panel metal from x: 8..18
$rand = New-Object System.Random(42)
for ($y = 620; $y -lt 1024; $y++) {
    for ($x = 70; $x -lt 230; $x++) {
        $srcX = 8 + ($x % 8)
        $c = $src.GetPixel($srcX, $y)
        $noise = $rand.Next(-3, 4)
        $r = [Math]::Min(255, [Math]::Max(0, ($c.R + $noise)))
        $gCol = [Math]::Min(255, [Math]::Max(0, ($c.G + $noise)))
        $b = [Math]::Min(255, [Math]::Max(0, ($c.B + $noise)))
        $cabin.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $r, $gCol, $b))
    }
}

# B. Speedometer dial (cx=395, cy=770, r=80):
# Mirror the clean right half to the left half
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

# C. Dashboard metal face and cowl around steering column
for ($y = 620; $y -lt 1024; $y++) {
    for ($x = 230; $x -lt 650; $x++) {
        $distSpeedo = [Math]::Sqrt(($x - 395) * ($x - 395) + ($y - 770) * ($y - 770))
        $distAux = [Math]::Sqrt(($x - 570) * ($x - 570) + ($y - 770) * ($y - 770))
        
        $dxHub = ($x - 465) / 270.0
        $dyHub = ($y - 875) / 240.0
        $distWheel = [Math]::Sqrt($dxHub * $dxHub + $dyHub * $dyHub)
        
        $isWheelPart = ($distWheel -ge 0.85 -and $distWheel -le 1.05) -or ($distWheel -le 0.32) -or ([Math]::Abs($dyHub) -lt 0.12 -and $distWheel -le 0.9)
        
        if ($isWheelPart -and $distSpeedo -gt 78 -and $distAux -gt 78) {
            $baseVal = if ($y -lt 640) { 45 } elseif ($y -gt 920) { 40 } else { 56 }
            $noise = $rand.Next(-4, 5)
            $val = [Math]::Min(255, [Math]::Max(0, ($baseVal + $noise)))
            $cabin.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $val, [Math]::Min(255, ($val + 2)), $val))
        }
    }
}

$g.Dispose()

$cabin.Save('d:\dev\games\hton\public\textures\cabin_ref.png', [System.Drawing.Imaging.ImageFormat]::Png)
$cabin.Dispose()
Write-Output "Cleaned cabin_ref.png successfully!"
