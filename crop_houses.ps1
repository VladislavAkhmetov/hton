Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Bitmap]::FromFile('C:\Users\amazi\.gemini\antigravity\brain\0c15a112-46e2-4d42-8724-fcf8cd8d6120\.user_uploaded\media_1792762555441_f6c866b3.jpg')

# House Left: x = 80..335, y = 190..490 (255 x 300)
$h1Rect = [System.Drawing.Rectangle]::new(80, 190, 255, 300)
$h1Bmp = New-Object System.Drawing.Bitmap($h1Rect.Width, $h1Rect.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g1 = [System.Drawing.Graphics]::FromImage($h1Bmp)
$g1.DrawImage($src, 0, 0, $h1Rect, [System.Drawing.GraphicsUnit]::Pixel)
$g1.Dispose()

# Key out sky (upper right corner of house crop)
for ($y = 0; $y -lt $h1Bmp.Height; $y++) {
    for ($x = 0; $x -lt $h1Bmp.Width; $x++) {
        $c = $h1Bmp.GetPixel($x, $y)
        # Sky is pale grey/blue: R > 175, G > 180, B > 185
        if ($y -lt 140 -and $c.R -gt 160 -and $c.G -gt 170 -and $c.B -gt 175) {
            $h1Bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
    }
}
$h1Bmp.Save('d:\dev\games\hton\public\textures\house_left.png', [System.Drawing.Imaging.ImageFormat]::Png)
$h1Bmp.Dispose()
Write-Output "House left saved!"

# House Right: x = 825..1005, y = 285..535 (180 x 250)
$h2Rect = [System.Drawing.Rectangle]::new(825, 285, 180, 250)
$h2Bmp = New-Object System.Drawing.Bitmap($h2Rect.Width, $h2Rect.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g2 = [System.Drawing.Graphics]::FromImage($h2Bmp)
$g2.DrawImage($src, 0, 0, $h2Rect, [System.Drawing.GraphicsUnit]::Pixel)
$g2.Dispose()

for ($y = 0; $y -lt $h2Bmp.Height; $y++) {
    for ($x = 0; $x -lt $h2Bmp.Width; $x++) {
        $c = $h2Bmp.GetPixel($x, $y)
        if ($y -lt 90 -and $c.R -gt 155 -and $c.G -gt 165 -and $c.B -gt 170) {
            $h2Bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
    }
}
$h2Bmp.Save('d:\dev\games\hton\public\textures\house_right.png', [System.Drawing.Imaging.ImageFormat]::Png)
$h2Bmp.Dispose()
Write-Output "House right saved!"

$src.Dispose()
