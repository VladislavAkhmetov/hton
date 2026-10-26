Add-Type -AssemblyName System.Drawing

$srcPath = 'C:\Users\amazi\.gemini\antigravity\brain\0c15a112-46e2-4d42-8724-fcf8cd8d6120\.user_uploaded\media_1792762555441_f6c866b3.jpg'
$outPath = 'd:\dev\games\hton\public\textures\cabin_ref.png'

$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $src.Width
$h = $src.Height
$dest = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

# In image2:
# The windshield frame is dark grey/black rubber gasket.
# Outside the windshield (cabin interior):
# - Left pillar: x < 75
# - Roof: y < 85 (and mirror at x: 740..990, y: 70..295)
# - Dashboard: y > 635 (and wiper at y > 575 in center, hand/wheel at left x: 100..420, y: 625..1024)
# Let's inspect pixel colors along the boundary to verify.

Write-Output "Image size: $w x $h"
$src.Dispose()
$dest.Dispose()
