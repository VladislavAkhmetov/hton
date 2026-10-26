Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Bitmap]::FromFile('C:\Users\amazi\.gemini\antigravity\brain\0c15a112-46e2-4d42-8724-fcf8cd8d6120\.user_uploaded\media_1792762555441_f6c866b3.jpg')

for ($x = 100; $x -le 950; $x += 100) {
    # Scan from y = 450 downwards to 700 to find bottom edge of windshield
    for ($y = 450; $y -lt 720; $y++) {
        $c = $src.GetPixel($x, $y)
        # Check transition to dark metal dashboard or steering wheel
        # Dashboard is dark: R < 80, G < 75, B < 75
        if ($y -gt 550 -and $c.R -lt 85 -and $c.G -lt 80 -and $c.B -lt 80) {
            Write-Output "Bottom at x=$x is y=$y (R=$($c.R), G=$($c.G), B=$($c.B))"
            break
        }
    }
}

$src.Dispose()
