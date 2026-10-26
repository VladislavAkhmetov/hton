Add-Type -AssemblyName System.Drawing

$srcPath = 'C:\Users\amazi\.gemini\antigravity\brain\0c15a112-46e2-4d42-8724-fcf8cd8d6120\.user_uploaded\media_1792762555441_f6c866b3.jpg'
$src = [System.Drawing.Bitmap]::FromFile($srcPath)

# Steering wheel & hand in image2 is within x = 0..770, y = 620..1024
$wheelRect = [System.Drawing.Rectangle]::new(0, 620, 770, 404)
$wheelBmp = New-Object System.Drawing.Bitmap($wheelRect.Width, $wheelRect.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gw = [System.Drawing.Graphics]::FromImage($wheelBmp)
$gw.DrawImage($src, 0, 0, $wheelRect, [System.Drawing.GraphicsUnit]::Pixel)
$gw.Dispose()

# The steering wheel rim top arc in local coordinates (y_local = y_orig - 620):
# Hub center is at x = 465, y = 875 (y_local = 255)
# Rim radius is Rx ~ 270, Ry ~ 240
# Any pixel above the rim arc (and not part of the glove hand at x: 100..380) is transparent!
for ($y = 0; $y -lt 140; $y++) {
    for ($x = 0; $x -lt $wheelBmp.Width; $x++) {
        $c = $wheelBmp.GetPixel($x, $y)
        
        # Check if pixel is part of the glove or hand
        # Hand glove at x: 110..385, y_local: 5..140
        $isHand = ($x -ge 110 -and $x -le 385 -and $y -ge 15 -and $c.R -gt 90 -and $c.G -gt 80)
        
        # Ellipse formula for the top edge of the rim
        $dx = ($x - 465) / 275.0
        $dy = ($y - 255) / 245.0
        $dist = $dx * $dx + $dy * $dy
        
        # If outside the rim (above the wheel) and not hand: transparent!
        if (-not $isHand -and ($dist -gt 1.02 -or $y -lt 18)) {
            $wheelBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
    }
}

$wheelBmp.Save('d:\dev\games\hton\public\textures\wheel_hand.png', [System.Drawing.Imaging.ImageFormat]::Png)
$wheelBmp.Dispose()
$src.Dispose()
Write-Output "Cleaned wheel_hand.png with perfect rim outline!"
