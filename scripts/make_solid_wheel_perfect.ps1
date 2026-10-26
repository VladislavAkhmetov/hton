Add-Type -AssemblyName System.Drawing

$srcPath = 'C:\Users\amazi\.gemini\antigravity\brain\0c15a112-46e2-4d42-8724-fcf8cd8d6120\.user_uploaded\media_1792762555441_f6c866b3.jpg'
$src = [System.Drawing.Bitmap]::FromFile($srcPath)

$w = 770
$h = 404
$wheelBmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

# Hand & Arm polygon covering the entire driver hand & arm
$handPts = [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(0, 404),
    [System.Drawing.PointF]::new(60, 404),
    [System.Drawing.PointF]::new(115, 340),
    [System.Drawing.PointF]::new(145, 275),
    [System.Drawing.PointF]::new(145, 240),
    [System.Drawing.PointF]::new(175, 205),
    [System.Drawing.PointF]::new(205, 170),
    [System.Drawing.PointF]::new(240, 135),
    [System.Drawing.PointF]::new(290, 80),
    [System.Drawing.PointF]::new(340, 35),
    [System.Drawing.PointF]::new(375, 12),
    [System.Drawing.PointF]::new(410, 16),
    [System.Drawing.PointF]::new(418, 45),
    [System.Drawing.PointF]::new(380, 95),
    [System.Drawing.PointF]::new(380, 115),
    [System.Drawing.PointF]::new(440, 125),
    [System.Drawing.PointF]::new(455, 155),
    [System.Drawing.PointF]::new(455, 195),
    [System.Drawing.PointF]::new(420, 225),
    [System.Drawing.PointF]::new(370, 255),
    [System.Drawing.PointF]::new(315, 295),
    [System.Drawing.PointF]::new(275, 345),
    [System.Drawing.PointF]::new(245, 404),
    [System.Drawing.PointF]::new(0, 404)
)

$handPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$handPath.AddPolygon($handPts)

$cx = 465.0
$cy = 255.0

for ($y = 0; $y -lt $h; $y++) {
    $srcY = 620 + $y
    for ($x = 0; $x -lt $w; $x++) {
        $srcX = $x
        
        $inHand = $handPath.IsVisible([float]$x, [float]$y)
        
        $dx = ($x - $cx) / 268.0
        $dy = ($y - $cy) / 238.0
        $dist = [Math]::Sqrt($dx * $dx + $dy * $dy)
        
        $c = $src.GetPixel($srcX, $srcY)
        
        # Wheel rim (include highlight reflection where $c.R is up to 150)
        $isRim = ($dist -ge 0.86 -and $dist -le 1.05 -and $y -ge 12 -and ($c.R -lt 78 -or ($dist -ge 0.89 -and $dist -le 1.02 -and $c.R -lt 150 -and $c.B -lt 150)))
        
        # Hub
        $isHub = ($dist -le 0.30 -and $c.R -lt 85 -and $c.G -lt 85 -and $c.B -lt 85)
        
        # Spokes
        $isSpoke = ($dist -le 0.95 -and [Math]::Abs($dy) -lt 0.14 -and $c.R -lt 85 -and $c.G -lt 85 -and $c.B -lt 85)
        
        if ($inHand -or $isRim -or $isHub -or $isSpoke) {
            $wheelBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $c.R, $c.G, $c.B))
        } else {
            $wheelBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
    }
}

$wheelBmp.Save('d:\dev\games\hton\public\textures\wheel_hand.png', [System.Drawing.Imaging.ImageFormat]::Png)
$wheelBmp.Save('C:\Users\amazi\.gemini\antigravity\brain\0c15a112-46e2-4d42-8724-fcf8cd8d6120\clean_wheel_perfect.png', [System.Drawing.Imaging.ImageFormat]::Png)

$wheelBmp.Dispose()
$src.Dispose()
Write-Output "Perfect solid wheel and hand created!"
