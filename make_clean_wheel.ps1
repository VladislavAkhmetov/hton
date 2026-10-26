Add-Type -AssemblyName System.Drawing

$srcPath = 'C:\Users\amazi\.gemini\antigravity\brain\0c15a112-46e2-4d42-8724-fcf8cd8d6120\.user_uploaded\media_1792762555441_f6c866b3.jpg'
$src = [System.Drawing.Bitmap]::FromFile($srcPath)

# Steering wheel & hand in image2: x = 0..770, y = 620..1024
$wheelRect = [System.Drawing.Rectangle]::new(0, 620, 770, 404)
$wheelBmp = New-Object System.Drawing.Bitmap($wheelRect.Width, $wheelRect.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gw = [System.Drawing.Graphics]::FromImage($wheelBmp)
$gw.DrawImage($src, 0, 0, $wheelRect, [System.Drawing.GraphicsUnit]::Pixel)
$gw.Dispose()

# Keep ONLY the steering wheel rim, spokes, hub, and the driver's hand!
# Make all dashboard metal outside the wheel/hand 100% transparent:
for ($y = 0; $y -lt $wheelBmp.Height; $y++) {
    for ($x = 0; $x -lt $wheelBmp.Width; $x++) {
        $c = $wheelBmp.GetPixel($x, $y)
        
        # 1. Hand in glove at x: 110..385, y: 15..320
        $isHand = ($x -ge 110 -and $x -le 385 -and $y -ge 15 -and $y -le 320 -and $c.R -gt 85 -and $c.G -gt 75)
        
        # 2. Wheel rim, spokes, hub around center (465, 255)
        $dx = ($x - 465) / 270.0
        $dy = ($y - 255) / 240.0
        $dist = [Math]::Sqrt($dx * $dx + $dy * $dy)
        
        # Wheel rim ring (dist between 0.88 and 1.04)
        $isRim = ($dist -ge 0.88 -and $dist -le 1.04 -and $c.R -lt 65 -and $c.G -lt 65 -and $c.B -lt 65)
        
        # Wheel center hub (dist < 0.28)
        $isHub = ($dist -le 0.28)
        
        # Spokes (horizontal bars connecting hub to rim)
        $isSpoke = ($dist -le 0.95 -and [Math]::Abs($dy) -lt 0.12 -and $c.R -lt 70 -and $c.G -lt 70 -and $c.B -lt 70)
        
        if (-not ($isHand -or $isRim -or $isHub -or $isSpoke)) {
            $wheelBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
    }
}

$wheelBmp.Save('d:\dev\games\hton\public\textures\wheel_hand.png', [System.Drawing.Imaging.ImageFormat]::Png)
$wheelBmp.Dispose()
$src.Dispose()
Write-Output "wheel_hand.png perfected without any dashboard seams!"
