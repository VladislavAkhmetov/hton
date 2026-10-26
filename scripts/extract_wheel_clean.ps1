Add-Type -AssemblyName System.Drawing

$srcPath = 'C:\Users\amazi\.gemini\antigravity\brain\0c15a112-46e2-4d42-8724-fcf8cd8d6120\.user_uploaded\media_1792762555441_f6c866b3.jpg'
$src = [System.Drawing.Bitmap]::FromFile($srcPath)

# Steering wheel and hand bounding box in Image 2:
# x: 40 to 760, y: 620 to 1024
# Center hub is at (465, 875)
# Hub radius ~ 70
# Spokes go horizontally left (to x ~ 230) and right (to x ~ 700)
# Rim is at radius ~ 265..295
# Hand in glove is at x: 100..400, y: 640..920
# Driver's arm is at x: 40..220, y: 880..1024

# Let's extract EXACTLY the hand, arm, and the entire steering wheel:
$wheelBmp = New-Object System.Drawing.Bitmap(760, 404, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

for ($y = 0; $y -lt 404; $y++) {
    $srcY = 620 + $y
    for ($x = 0; $x -lt 760; $x++) {
        $srcX = $x
        $c = $src.GetPixel($srcX, $srcY)
        
        # Check if pixel belongs to hand, arm, or wheel
        $dx = ($srcX - 465) / 270.0
        $dy = ($srcY - 875) / 240.0
        $dist = [Math]::Sqrt($dx * $dx + $dy * $dy)
        
        # 1. Driver's hand, fingers, knitted glove, and arm
        # Glove wool colors: R: 100..185, G: 95..180, B: 90..175 (tan/grey wool knit)
        # Skin colors: R: 160..225, G: 110..160, B: 90..135 (flesh tone)
        $isWool = ($srcX -le 420 -and $srcY -le 960 -and $c.R -ge 85 -and $c.G -ge 80 -and $c.B -ge 75 -and [Math]::Abs($c.R - $c.G) -le 25)
        $isSkin = ($srcX -le 420 -and $c.R -gt 135 -and $c.G -gt 90 -and $c.B -lt 140 -and ($c.R - $c.B) -gt 25)
        $isArm = ($srcX -le 220 -and $srcY -ge 880 -and $isSkin)
        $isHand = ($isWool -or $isSkin -or $isArm)
        
        # 2. Steering wheel rim (dark rubber ring)
        # Note: on top-left, the hand overlaps the rim
        $isRim = ($dist -ge 0.86 -and $dist -le 1.05 -and $c.R -lt 75 -and $c.G -lt 75 -and $c.B -lt 75)
        
        # 3. Steering wheel center hub & horn button
        $isHub = ($dist -le 0.32 -and $c.R -lt 75 -and $c.G -lt 75 -and $c.B -lt 75)
        
        # 4. Spokes
        $isSpoke = ($dist -le 0.95 -and [Math]::Abs($dy) -lt 0.14 -and $c.R -lt 75 -and $c.G -lt 75 -and $c.B -lt 75)
        
        if ($isHand -or $isRim -or $isHub -or $isSpoke) {
            $wheelBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $c.R, $c.G, $c.B))
        } else {
            $wheelBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
    }
}

$wheelBmp.Save('d:\dev\games\hton\public\textures\wheel_hand.png', [System.Drawing.Imaging.ImageFormat]::Png)
$wheelBmp.Save('C:\Users\amazi\.gemini\antigravity\brain\0c15a112-46e2-4d42-8724-fcf8cd8d6120\extracted_wheel_hand.png', [System.Drawing.Imaging.ImageFormat]::Png)
$wheelBmp.Dispose()
$src.Dispose()
Write-Output "wheel_hand extracted!"
