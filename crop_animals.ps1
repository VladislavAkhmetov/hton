Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Bitmap]::FromFile('C:\Users\amazi\.gemini\antigravity\brain\0c15a112-46e2-4d42-8724-fcf8cd8d6120\.user_uploaded\media_1792762555441_f6c866b3.jpg')

# 1. Crop Dog: x = 310..395, y = 445..540
$dogRect = [System.Drawing.Rectangle]::new(310, 445, 85, 95)
$dogBmp = New-Object System.Drawing.Bitmap($dogRect.Width, $dogRect.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gDog = [System.Drawing.Graphics]::FromImage($dogBmp)
$gDog.DrawImage($src, 0, 0, $dogRect, [System.Drawing.GraphicsUnit]::Pixel)
$gDog.Dispose()

# Key out green grass around dog
# Grass is green/yellow: G > 100, G > R, G > B
for ($y = 0; $y -lt $dogBmp.Height; $y++) {
    for ($x = 0; $x -lt $dogBmp.Width; $x++) {
        $c = $dogBmp.GetPixel($x, $y)
        # Check if green grass or grey fence background
        $isGrass = ($c.G -gt 90 -and $c.G -ge $c.R -and ($c.G - $c.B) -gt 15)
        $isFence = ($c.R -gt 90 -and $c.G -gt 90 -and $c.B -gt 90 -and $y -lt 30)
        # The dog is brown: R > 75, R > G, R > B*1.4
        $isDog = ($c.R -gt 60 -and $c.R -gt ($c.G + 5) -and $c.R -gt ($c.B + 15))
        if (-not $isDog -and ($isGrass -or $isFence)) {
            $dogBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
    }
}
$dogBmp.Save('d:\dev\games\hton\public\textures\dog_sprite.png', [System.Drawing.Imaging.ImageFormat]::Png)
$dogBmp.Dispose()
Write-Output "Dog sprite saved!"

# 2. Crop Cow: x = 630..745, y = 415..525
$cowRect = [System.Drawing.Rectangle]::new(630, 415, 115, 110)
$cowBmp = New-Object System.Drawing.Bitmap($cowRect.Width, $cowRect.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gCow = [System.Drawing.Graphics]::FromImage($cowBmp)
$gCow.DrawImage($src, 0, 0, $cowRect, [System.Drawing.GraphicsUnit]::Pixel)
$gCow.Dispose()

# Key out green grass and fence behind cow
for ($y = 0; $y -lt $cowBmp.Height; $y++) {
    for ($x = 0; $x -lt $cowBmp.Width; $x++) {
        $c = $cowBmp.GetPixel($x, $y)
        $isGrass = ($c.G -gt 85 -and $c.G -ge $c.R -and ($c.G - $c.B) -gt 15)
        $isFence = ($c.R -gt 80 -and $c.G -gt 75 -and $c.B -gt 70 -and [Math]::Abs($c.R - $c.G) -lt 15 -and [Math]::Abs($c.G - $c.B) -lt 15)
        $isCowBrown = ($c.R -gt 85 -and $c.R -gt ($c.G + 15) -and $c.R -gt ($c.B + 20))
        $isCowWhite = ($c.R -gt 180 -and $c.G -gt 180 -and $c.B -gt 180)
        if (-not $isCowBrown -and -not $isCowWhite -and ($isGrass -or $isFence)) {
            $cowBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
    }
}
$cowBmp.Save('d:\dev\games\hton\public\textures\cow_sprite.png', [System.Drawing.Imaging.ImageFormat]::Png)
$cowBmp.Dispose()
Write-Output "Cow sprite saved!"

$src.Dispose()
