Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Bitmap]::FromFile('C:\Users\amazi\.gemini\antigravity\brain\0c15a112-46e2-4d42-8724-fcf8cd8d6120\.user_uploaded\media_1792762555441_f6c866b3.jpg')
$w = $src.Width
$h = $src.Height

# Test: find the boundary of the windshield
# Let's inspect rows and columns to find the exact inner windshield contour
$topY = New-Object int[] $w
$bottomY = New-Object int[] $w

# For each x from 75 to 980, scan downwards from y = 50 to find the top of the windshield
# and scan upwards from y = 700 to find the bottom of the windshield
for ($x = 0; $x -lt $w; $x++) {
    $topY[$x] = -1
    $bottomY[$x] = -1
    
    # Scan from y = 70 to 300 for top edge of windshield (transition from dark roof to sky)
    for ($y = 70; $y -lt 300; $y++) {
        $c = $src.GetPixel($x, $y)
        $brightness = [int]$c.R + [int]$c.G + [int]$c.B
        # Inside the mirror at x > 750 and y < 290, skip
        if ($x -ge 760 -and $x -le 995 -and $y -le 295) {
            continue
        }
        if ($brightness -gt 250) {
            $topY[$x] = $y
            break
        }
    }
}

Write-Output "Contour check: Top at x=200 is $($topY[200]), Top at x=500 is $($topY[500]), Top at x=700 is $($topY[700])"
$src.Dispose()
