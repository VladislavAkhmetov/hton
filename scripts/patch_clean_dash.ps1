Add-Type -AssemblyName System.Drawing

$cabinPath = 'd:\dev\games\hton\public\textures\cabin_ref.png'
$wheelPath = 'd:\dev\games\hton\public\textures\wheel_hand.png'
$srcPath = 'C:\Users\amazi\.gemini\antigravity\brain\0c15a112-46e2-4d42-8724-fcf8cd8d6120\.user_uploaded\media_1792762555441_f6c866b3.jpg'

$cabin = [System.Drawing.Bitmap]::FromFile($cabinPath)
$wheel = [System.Drawing.Bitmap]::FromFile($wheelPath)
$src = [System.Drawing.Bitmap]::FromFile($srcPath)

$rand = New-Object System.Random(42)

# Wheel coordinates offset in cabin: x: 0..770, y: 620..1024
for ($wy = 0; $wy -lt $wheel.Height; $wy++) {
    $cy = 620 + $wy
    for ($wx = 0; $wx -lt $wheel.Width; $wx++) {
        $cx = $wx
        
        $wp = $wheel.GetPixel($wx, $wy)
        if ($wp.A -gt 20) {
            # This pixel has part of the wheel or driver hand.
            # Inpaint it on $cabin so the dashboard under the wheel is clean!
            
            if ($cx -lt 220) {
                # 1. Door panel area
                if ($cy -lt 730) {
                    $base = 57
                } else {
                    $t = ($cy - 730.0) / (1024.0 - 730.0)
                    $base = [int](44.0 - $t * 12.0)
                }
                $noise = $rand.Next(-2, 3)
                $val = [Math]::Min(255, [Math]::Max(0, ($base + $noise)))
                $cabin.SetPixel($cx, $cy, [System.Drawing.Color]::FromArgb(255, $val, [Math]::Min(255, ($val + 2)), $val))
            } else {
                # 2. Dashboard area
                $distSpeedo = [Math]::Sqrt(($cx - 395) * ($cx - 395) + ($cy - 770) * ($cy - 770))
                $distAux = [Math]::Sqrt(($cx - 570) * ($cx - 570) + ($cy - 770) * ($cy - 770))
                
                if ($distSpeedo -le 78) {
                    # Speedometer dial face - mirror from right half of speedometer
                    $mirrorX = 395 + (395 - $cx)
                    $c = $src.GetPixel($mirrorX, $cy)
                    $cabin.SetPixel($cx, $cy, $c)
                } elseif ($distAux -le 78) {
                    # Aux dial face - sample clean dial face pixel
                    $c = $src.GetPixel($cx, $cy)
                    if ($c.R -lt 70 -and $c.G -lt 70 -and $c.B -lt 70) {
                        # Spoke was crossing dial - replace with black dial face
                        $cabin.SetPixel($cx, $cy, [System.Drawing.Color]::FromArgb(255, 20, 20, 20))
                    }
                } elseif ($cy -lt 645) {
                    # Top cowl bevel line
                    $c = $src.GetPixel(490 + ($cx % 20), $cy)
                    $cabin.SetPixel($cx, $cy, $c)
                } elseif ($cy -le 805) {
                    # Instrument cluster metal plate
                    $base = 36
                    $noise = $rand.Next(-2, 3)
                    $val = [Math]::Min(255, [Math]::Max(0, ($base + $noise)))
                    $cabin.SetPixel($cx, $cy, [System.Drawing.Color]::FromArgb(255, $val, [Math]::Min(255, ($val + 1)), $val))
                } else {
                    # Lower dashboard metal face
                    $base = 54
                    $noise = $rand.Next(-3, 4)
                    $val = [Math]::Min(255, [Math]::Max(0, ($base + $noise)))
                    $cabin.SetPixel($cx, $cy, [System.Drawing.Color]::FromArgb(255, $val, [Math]::Min(255, ($val + 2)), $val))
                }
            }
        }
    }
}

# Redraw the clean door/dash vertical seam line at x = 218..220
for ($y = 620; $y -lt 1024; $y++) {
    $cabin.SetPixel(218, $y, [System.Drawing.Color]::FromArgb(255, 20, 22, 20))
    $cabin.SetPixel(219, $y, [System.Drawing.Color]::FromArgb(255, 30, 32, 29))
    $cabin.SetPixel(220, $y, [System.Drawing.Color]::FromArgb(255, 52, 54, 50))
}

$wheel.Dispose()
$src.Dispose()

$cabin.Save('d:\dev\games\hton\public\textures\cabin_ref_clean.png', [System.Drawing.Imaging.ImageFormat]::Png)
$cabin.Dispose()

# Replace cabin_ref.png with cabin_ref_clean.png
Move-Item -Path 'd:\dev\games\hton\public\textures\cabin_ref_clean.png' -Destination 'd:\dev\games\hton\public\textures\cabin_ref.png' -Force
Copy-Item -Path 'd:\dev\games\hton\public\textures\cabin_ref.png' -Destination 'C:\Users\amazi\.gemini\antigravity\brain\0c15a112-46e2-4d42-8724-fcf8cd8d6120\clean_dash_under_wheel.png' -Force

Write-Output "Clean dashboard under wheel generated successfully!"
