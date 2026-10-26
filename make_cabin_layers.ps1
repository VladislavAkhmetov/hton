Add-Type -AssemblyName System.Drawing

$srcPath = 'C:\Users\amazi\.gemini\antigravity\brain\0c15a112-46e2-4d42-8724-fcf8cd8d6120\.user_uploaded\media_1792762555441_f6c866b3.jpg'
$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $src.Width
$h = $src.Height

# 1. Generate clean cabin_ref.png
$dest = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($dest)
$g.DrawImage($src, 0, 0, $w, $h)

# Perfect windshield opening:
# Top curve:
$pts = [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(98, 240),
    [System.Drawing.PointF]::new(112, 190),
    [System.Drawing.PointF]::new(145, 160),
    [System.Drawing.PointF]::new(200, 142),
    [System.Drawing.PointF]::new(300, 134),
    [System.Drawing.PointF]::new(450, 130),
    [System.Drawing.PointF]::new(600, 130),
    [System.Drawing.PointF]::new(740, 132),
    
    # Trace around the rearview mirror:
    [System.Drawing.PointF]::new(746, 175),
    [System.Drawing.PointF]::new(748, 230),
    [System.Drawing.PointF]::new(755, 280),
    [System.Drawing.PointF]::new(775, 298),
    [System.Drawing.PointF]::new(862, 305),
    
    # Front right windshield pillar (cleanly separating front windshield from right side window):
    [System.Drawing.PointF]::new(866, 380),
    [System.Drawing.PointF]::new(870, 460),
    [System.Drawing.PointF]::new(868, 540),
    [System.Drawing.PointF]::new(858, 580),
    [System.Drawing.PointF]::new(840, 608),
    
    # Dashboard top edge across hood:
    [System.Drawing.PointF]::new(740, 615),
    [System.Drawing.PointF]::new(640, 618),
    [System.Drawing.PointF]::new(540, 620),
    [System.Drawing.PointF]::new(420, 622),
    [System.Drawing.PointF]::new(300, 622),
    [System.Drawing.PointF]::new(180, 620),
    [System.Drawing.PointF]::new(110, 618),
    
    # Left A-pillar:
    [System.Drawing.PointF]::new(96, 560),
    [System.Drawing.PointF]::new(88, 450),
    [System.Drawing.PointF]::new(86, 350),
    [System.Drawing.PointF]::new(90, 280)
)

$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddPolygon($pts)

$g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
$g.SetClip($path)
$g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
$g.ResetClip()
$g.Dispose()

$dest.Save('d:\dev\games\hton\public\textures\cabin_ref.png', [System.Drawing.Imaging.ImageFormat]::Png)
$dest.Dispose()
Write-Output "Perfected cabin_ref.png!"

# 2. Extract steering wheel & hand as a rotating layer: wheel_hand.png
# Steering wheel & hand in image2 is within x = 0..770, y = 620..1024
$wheelRect = [System.Drawing.Rectangle]::new(0, 620, 770, 404)
$wheelBmp = New-Object System.Drawing.Bitmap($wheelRect.Width, $wheelRect.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gw = [System.Drawing.Graphics]::FromImage($wheelBmp)
$gw.DrawImage($src, 0, 0, $wheelRect, [System.Drawing.GraphicsUnit]::Pixel)
$gw.Dispose()

# Key out any background above the steering wheel rim / dashboard top
for ($y = 0; $y -lt 30; $y++) {
    for ($x = 0; $x -lt $wheelBmp.Width; $x++) {
        $c = $wheelBmp.GetPixel($x, $y)
        # Outside background is road/hood
        if ($c.R -gt 90 -or $c.G -gt 90 -or $c.B -gt 90) {
            $wheelBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
    }
}

$wheelBmp.Save('d:\dev\games\hton\public\textures\wheel_hand.png', [System.Drawing.Imaging.ImageFormat]::Png)
$wheelBmp.Dispose()
Write-Output "wheel_hand.png generated!"

$src.Dispose()
