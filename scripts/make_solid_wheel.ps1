Add-Type -AssemblyName System.Drawing

$srcPath = 'C:\Users\amazi\.gemini\antigravity\brain\0c15a112-46e2-4d42-8724-fcf8cd8d6120\.user_uploaded\media_1792762555441_f6c866b3.jpg'
$src = [System.Drawing.Bitmap]::FromFile($srcPath)

$w = 770
$h = 404
$wheelBmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

# Hand & Arm polygon tracing the exact silhouette of the gloved hand in Image 2
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
    [System.Drawing.PointF]::new(402, 18),
    [System.Drawing.PointF]::new(408, 45),
    [System.Drawing.PointF]::new(365, 95),
    [System.Drawing.PointF]::new(360, 115),
    [System.Drawing.PointF]::new(405, 125),
    [System.Drawing.PointF]::new(432, 155),
    [System.Drawing.PointF]::new(428, 195),
    [System.Drawing.PointF]::new(395, 220),
    [System.Drawing.PointF]::new(355, 245),
    [System.Drawing.PointF]::new(305, 285),
    [System.Drawing.PointF]::new(265, 340),
    [System.Drawing.PointF]::new(235, 404),
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
        
        # Wheel rim (y >= 14 prevents catching background road specks)
        $isRim = ($dist -ge 0.88 -and $dist -le 1.05 -and $y -ge 14 -and $c.R -lt 70 -and $c.G -lt 70 -and $c.B -lt 70)
        
        # Hub
        $isHub = ($dist -le 0.30 -and $c.R -lt 70 -and $c.G -lt 70 -and $c.B -lt 70)
        
        # Spokes
        $isSpoke = ($dist -le 0.95 -and [Math]::Abs($dy) -lt 0.13 -and $c.R -lt 70 -and $c.G -lt 70 -and $c.B -lt 70)
        
        if ($inHand -or $isRim -or $isHub -or $isSpoke) {
            $wheelBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $c.R, $c.G, $c.B))
        } else {
            $wheelBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
    }
}

$wheelBmp.Save('d:\dev\games\hton\public\textures\wheel_hand.png', [System.Drawing.Imaging.ImageFormat]::Png)
$wheelBmp.Save('C:\Users\amazi\.gemini\antigravity\brain\0c15a112-46e2-4d42-8724-fcf8cd8d6120\clean_wheel_final.png', [System.Drawing.Imaging.ImageFormat]::Png)

$wheelBmp.Dispose()
$src.Dispose()
Write-Output "Perfect solid wheel and hand created!"
