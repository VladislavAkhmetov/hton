Add-Type -AssemblyName System.Drawing

$srcPath = 'C:\Users\amazi\.gemini\antigravity\brain\0c15a112-46e2-4d42-8724-fcf8cd8d6120\.user_uploaded\media_1792762555441_f6c866b3.jpg'
$outPath = 'd:\dev\games\hton\public\textures\cabin_ref.png'

$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $src.Width
$h = $src.Height
$dest = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

$g = [System.Drawing.Graphics]::FromImage($dest)
$g.DrawImage($src, 0, 0, $w, $h)

$pts = [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(88, 230),
    [System.Drawing.PointF]::new(108, 185),
    [System.Drawing.PointF]::new(142, 155),
    [System.Drawing.PointF]::new(195, 138),
    [System.Drawing.PointF]::new(290, 130),
    [System.Drawing.PointF]::new(450, 126),
    [System.Drawing.PointF]::new(640, 126),
    [System.Drawing.PointF]::new(745, 128),
    
    # Trace around the rearview mirror mount and mirror body
    [System.Drawing.PointF]::new(758, 165),
    [System.Drawing.PointF]::new(765, 185),
    [System.Drawing.PointF]::new(755, 235),
    [System.Drawing.PointF]::new(760, 275),
    [System.Drawing.PointF]::new(778, 292),
    [System.Drawing.PointF]::new(890, 292),
    [System.Drawing.PointF]::new(985, 285),
    [System.Drawing.PointF]::new(998, 255),
    [System.Drawing.PointF]::new(996, 205),
    
    # Windshield right pillar:
    [System.Drawing.PointF]::new(985, 330),
    [System.Drawing.PointF]::new(968, 440),
    [System.Drawing.PointF]::new(945, 520),
    [System.Drawing.PointF]::new(918, 570),
    [System.Drawing.PointF]::new(880, 608),
    
    # Dashboard top edge:
    [System.Drawing.PointF]::new(800, 615),
    [System.Drawing.PointF]::new(720, 615),
    [System.Drawing.PointF]::new(640, 620),
    [System.Drawing.PointF]::new(550, 624),
    [System.Drawing.PointF]::new(460, 626),
    [System.Drawing.PointF]::new(395, 628),
    
    # Driver's index finger / hand contour:
    [System.Drawing.PointF]::new(365, 638),
    [System.Drawing.PointF]::new(340, 642),
    [System.Drawing.PointF]::new(315, 660),
    [System.Drawing.PointF]::new(280, 675),
    [System.Drawing.PointF]::new(245, 672),
    [System.Drawing.PointF]::new(210, 680),
    [System.Drawing.PointF]::new(175, 715),
    [System.Drawing.PointF]::new(145, 760),
    [System.Drawing.PointF]::new(118, 830),
    [System.Drawing.PointF]::new(110, 710),
    [System.Drawing.PointF]::new(102, 630),
    
    # Left A-pillar:
    [System.Drawing.PointF]::new(92, 570),
    [System.Drawing.PointF]::new(82, 450),
    [System.Drawing.PointF]::new(78, 350),
    [System.Drawing.PointF]::new(82, 280)
)

$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddPolygon($pts)

# Set compositing mode to source copy to overwrite with alpha = 0
$g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
$g.SetClip($path)
$g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
$g.ResetClip()

$g.Dispose()
$dest.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$src.Dispose()
$dest.Dispose()
Write-Output "Successfully generated $outPath"
