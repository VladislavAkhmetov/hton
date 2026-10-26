Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Bitmap]::FromFile('C:\Users\amazi\.gemini\antigravity\brain\0c15a112-46e2-4d42-8724-fcf8cd8d6120\.user_uploaded\media_1792762555441_f6c866b3.jpg')

# Road texture from center: x = 380..640, y = 440..620 (260 x 180)
$rRect = [System.Drawing.Rectangle]::new(380, 440, 260, 180)
$rBmp = New-Object System.Drawing.Bitmap($rRect.Width, $rRect.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($rBmp)
$g.DrawImage($src, 0, 0, $rRect, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

$rBmp.Save('d:\dev\games\hton\public\textures\mud_puddle_road.png', [System.Drawing.Imaging.ImageFormat]::Png)
$rBmp.Dispose()
$src.Dispose()
Write-Output "Road texture saved!"
