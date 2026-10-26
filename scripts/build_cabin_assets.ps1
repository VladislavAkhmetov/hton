Add-Type -AssemblyName System.Drawing

$srcPath = 'C:\Users\amazi\.gemini\antigravity\brain\0c15a112-46e2-4d42-8724-fcf8cd8d6120\.user_uploaded\media_1792762555441_f6c866b3.jpg'
$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $src.Width
$h = $src.Height

# ==============================================================================
# 1. GENERATE CLEAN cabin_ref.png
# ==============================================================================
$cabin = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($cabin)
$g.DrawImage($src, 0, 0, $w, $h)

# Full windshield polygon spanning from left A-pillar across to the right edge!
$windshieldPts = [System.Drawing.PointF[]]@(
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
    
    # Bottom edge of rearview mirror going all the way to right border
    [System.Drawing.PointF]::new(862, 305),
    [System.Drawing.PointF]::new(960, 310),
    [System.Drawing.PointF]::new(1024, 312),
    
    # Right edge of windshield down to hood
    [System.Drawing.PointF]::new(1024, 615),
    
    # Bottom hood line spanning across
    [System.Drawing.PointF]::new(960, 615),
    [System.Drawing.PointF]::new(860, 616),
    [System.Drawing.PointF]::new(740, 616),
    [System.Drawing.PointF]::new(640, 618),
    [System.Drawing.PointF]::new(540, 620),
    [System.Drawing.PointF]::new(420, 622),
    [System.Drawing.PointF]::new(300, 622),
    [System.Drawing.PointF]::new(180, 620),
    [System.Drawing.PointF]::new(110, 618),
    
    # Left A-pillar lower section
    [System.Drawing.PointF]::new(96, 560),
    [System.Drawing.PointF]::new(88, 450),
    [System.Drawing.PointF]::new(86, 350),
    [System.Drawing.PointF]::new(90, 280)
)

$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddPolygon($windshieldPts)

$g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
$g.SetClip($path)
$g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
$g.ResetClip()

# Also make the small sky pocket above mirror transparent:
# Between x: 740 to 900, y: 130 to 175
$skyPocketPts = [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(740, 132),
    [System.Drawing.PointF]::new(900, 134),
    [System.Drawing.PointF]::new(900, 172),
    [System.Drawing.PointF]::new(746, 172)
)
$skyPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$skyPath.AddPolygon($skyPocketPts)
$g.SetClip($skyPath)
$g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
$g.ResetClip()

# ------------------------------------------------------------------------------
# Inpaint the dashboard under the steering wheel on cabin_ref.png so rotating the
# wheel never shows a duplicate ghost hand or wheel underneath!
# ------------------------------------------------------------------------------
$g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver

# Fill the hand / left wheel area with dashboard metal tone:
$dashBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 48, 51, 48))
$doorBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 38, 40, 37))
$gaugeRimBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 68, 72, 70))
$gaugeFaceBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 18, 19, 18))
$whitePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(200, 220, 220, 215), 2)
$orangePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(220, 210, 80, 40), 2)

# Restore left door panel area behind glove
$g.FillRectangle($doorBrush, 0, 620, 220, 404)

# Restore dashboard metal panel behind steering column
$g.FillRectangle($dashBrush, 220, 620, 460, 404)

# Bevel highlight lines across dashboard
$dashPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 65, 68, 63), 3)
$dashShadowPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 25, 27, 24), 3)
$g.DrawLine($dashPen, 0, 622, 680, 622)
$g.DrawLine($dashShadowPen, 0, 625, 680, 625)
$g.DrawLine($dashPen, 180, 710, 680, 710)
$g.DrawLine($dashShadowPen, 180, 713, 680, 713)

# Function to draw authentic round Bukhanka gauge dial
function Draw-Gauge([System.Drawing.Graphics]$gr, [int]$cx, [int]$cy, [int]$r, [string]$type) {
    # Chrome/metal bezel
    $bezelPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 85, 90, 88), 4)
    $innerBezel = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 30, 32, 30), 2)
    $gr.FillEllipse($gaugeRimBrush, ($cx - $r - 4), ($cy - $r - 4), (($r + 4) * 2), (($r + 4) * 2))
    $gr.DrawEllipse($bezelPen, ($cx - $r - 4), ($cy - $r - 4), (($r + 4) * 2), (($r + 4) * 2))
    
    # Black gauge face
    $gr.FillEllipse($gaugeFaceBrush, ($cx - $r), ($cy - $r), ($r * 2), ($r * 2))
    $gr.DrawEllipse($innerBezel, ($cx - $r), ($cy - $r), ($r * 2), ($r * 2))
    
    # Tick marks
    for ($ang = 135; $ang -le 405; $ang += 27) {
        $rad = $ang * [Math]::PI / 180.0
        $x1 = $cx + [Math]::Cos($rad) * ($r * 0.72)
        $y1 = $cy + [Math]::Sin($rad) * ($r * 0.72)
        $x2 = $cx + [Math]::Cos($rad) * ($r * 0.88)
        $y2 = $cy + [Math]::Sin($rad) * ($r * 0.88)
        $gr.DrawLine($whitePen, [float]$x1, [float]$y1, [float]$x2, [float]$y2)
    }
    
    # Sub-ticks
    $subPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(160, 180, 180, 175), 1)
    for ($ang = 135; $ang -le 405; $ang += 9) {
        $rad = $ang * [Math]::PI / 180.0
        $x1 = $cx + [Math]::Cos($rad) * ($r * 0.80)
        $y1 = $cy + [Math]::Sin($rad) * ($r * 0.80)
        $x2 = $cx + [Math]::Cos($rad) * ($r * 0.88)
        $y2 = $cy + [Math]::Sin($rad) * ($r * 0.88)
        $gr.DrawLine($subPen, [float]$x1, [float]$y1, [float]$x2, [float]$y2)
    }
    
    # Center hub cap
    $hubBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 35, 36, 35))
    $gr.FillEllipse($hubBrush, ($cx - 10), ($cy - 10), 20, 20)
    
    $bezelPen.Dispose()
    $innerBezel.Dispose()
    $subPen.Dispose()
    $hubBrush.Dispose()
}

# Draw Speedometer on left at (395, 770), radius 76
Draw-Gauge $g 395 770 76 "speedo"

# Draw Secondary cluster on right at (570, 770), radius 76
Draw-Gauge $g 570 770 76 "aux"

$dashBrush.Dispose()
$doorBrush.Dispose()
$gaugeRimBrush.Dispose()
$gaugeFaceBrush.Dispose()
$whitePen.Dispose()
$orangePen.Dispose()
$dashPen.Dispose()
$dashShadowPen.Dispose()

$g.Dispose()

$cabin.Save('d:\dev\games\hton\public\textures\cabin_ref.png', [System.Drawing.Imaging.ImageFormat]::Png)
$cabin.Dispose()
Write-Output "cabin_ref.png generated successfully!"

# ==============================================================================
# 2. GENERATE CLEAN wheel_hand.png (steering wheel + gloved hand)
# ==============================================================================
$wheelRect = [System.Drawing.Rectangle]::new(0, 620, 770, 404)
$wheelBmp = New-Object System.Drawing.Bitmap($wheelRect.Width, $wheelRect.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gw = [System.Drawing.Graphics]::FromImage($wheelBmp)
$gw.DrawImage($src, 0, 0, $wheelRect, [System.Drawing.GraphicsUnit]::Pixel)
$gw.Dispose()

for ($y = 0; $y -lt $wheelBmp.Height; $y++) {
    for ($x = 0; $x -lt $wheelBmp.Width; $x++) {
        $c = $wheelBmp.GetPixel($x, $y)
        
        # 1. Driver's hand in knitted fingerless glove + arm
        # Arm & hand at x: 60..420, y: 10..404
        $isGlove = ($x -ge 100 -and $x -le 390 -and $y -ge 15 -and $y -le 350 -and $c.R -ge 80 -and $c.G -ge 75 -and $c.B -ge 70)
        $isSkin = ($x -ge 50 -and $x -le 420 -and $y -ge 10 -and $y -le 404 -and $c.R -gt 130 -and $c.G -gt 85 -and $c.B -lt 120)
        
        # 2. Wheel rim, spokes, and hub around center (465, 255)
        $dx = ($x - 465) / 270.0
        $dy = ($y - 255) / 240.0
        $dist = [Math]::Sqrt($dx * $dx + $dy * $dy)
        
        # Wheel rim ring (dist between 0.86 and 1.05)
        $isRim = ($dist -ge 0.86 -and $dist -le 1.05 -and $c.R -lt 72 -and $c.G -lt 72 -and $c.B -lt 72)
        
        # Wheel center horn hub (dist < 0.28)
        $isHub = ($dist -le 0.28 -and $c.R -lt 68 -and $c.G -lt 68 -and $c.B -lt 68)
        
        # Spokes (connecting hub to rim)
        $isSpoke = ($dist -le 0.95 -and [Math]::Abs($dy) -lt 0.14 -and $c.R -lt 68 -and $c.G -lt 68 -and $c.B -lt 68)
        
        if (-not ($isGlove -or $isSkin -or $isRim -or $isHub -or $isSpoke)) {
            $wheelBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
    }
}

$wheelBmp.Save('d:\dev\games\hton\public\textures\wheel_hand.png', [System.Drawing.Imaging.ImageFormat]::Png)
$wheelBmp.Dispose()
Write-Output "wheel_hand.png generated successfully!"

$src.Dispose()
