Add-Type -AssemblyName System.Drawing

$srcPath = 'C:\Users\amazi\.gemini\antigravity\brain\0c15a112-46e2-4d42-8724-fcf8cd8d6120\.user_uploaded\media_1792762555441_f6c866b3.jpg'
$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $src.Width
$h = $src.Height

$dest = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($dest)
$g.DrawImage($src, 0, 0, $w, $h)

# Complete windshield opening:
$pts = [System.Drawing.PointF[]]@(
    # Left A-pillar
    [System.Drawing.PointF]::new(98, 240),
    [System.Drawing.PointF]::new(112, 190),
    [System.Drawing.PointF]::new(145, 160),
    [System.Drawing.PointF]::new(200, 142),
    [System.Drawing.PointF]::new(300, 134),
    [System.Drawing.PointF]::new(450, 130),
    [System.Drawing.PointF]::new(600, 130),
    [System.Drawing.PointF]::new(740, 132),
    
    # Left edge of rearview mirror
    [System.Drawing.PointF]::new(746, 175),
    [System.Drawing.PointF]::new(748, 230),
    [System.Drawing.PointF]::new(755, 280),
    [System.Drawing.PointF]::new(775, 298),
    
    # Bottom edge of rearview mirror extending all the way to right screen border:
    [System.Drawing.PointF]::new(862, 305),
    [System.Drawing.PointF]::new(960, 310),
    [System.Drawing.PointF]::new(1024, 312),
    
    # Right border down to hood line
    [System.Drawing.PointF]::new(1024, 615),
    
    # Bottom hood line spanning across:
    [System.Drawing.PointF]::new(960, 615),
    [System.Drawing.PointF]::new(860, 616),
    [System.Drawing.PointF]::new(740, 616),
    [System.Drawing.PointF]::new(640, 618),
    [System.Drawing.PointF]::new(540, 620),
    [System.Drawing.PointF]::new(420, 622),
    [System.Drawing.PointF]::new(300, 622),
    [System.Drawing.PointF]::new(180, 620),
    [System.Drawing.PointF]::new(110, 618),
    
    # Left A-pillar lower section:
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

# Sky cutout above mirror (left of bracket)
$skyPocketPts = [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(740, 132),
    [System.Drawing.PointF]::new(895, 134),
    [System.Drawing.PointF]::new(895, 172),
    [System.Drawing.PointF]::new(746, 172)
)
$skyPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$skyPath.AddPolygon($skyPocketPts)
$g.SetClip($skyPath)
$g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
$g.ResetClip()

$g.Dispose()

$dest.Save('d:\dev\games\hton\public\textures\cabin_ref.png', [System.Drawing.Imaging.ImageFormat]::Png)
$dest.Dispose()
$src.Dispose()
Write-Output "Clean full-windshield cabin_ref.png generated!"
