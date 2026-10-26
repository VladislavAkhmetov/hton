Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Bitmap]::FromFile('C:\Users\amazi\.gemini\antigravity\brain\0c15a112-46e2-4d42-8724-fcf8cd8d6120\.user_uploaded\media_1792762555441_f6c866b3.jpg')

for ($y = 250; $y -le 620; $y += 50) {
    # Scan from right (x = 990) towards left to find where the dark right pillar meets the windshield
    for ($x = 990; $x -ge 700; $x--) {
        $c = $src.GetPixel($x, $y)
        # Check transition from dark pillar to sky/road
        $bright = [int]$c.R + [int]$c.G + [int]$c.B
        if ($bright -gt 260) {
            Write-Output "Right edge at y=$y is x=$x (R=$($c.R), G=$($c.G), B=$($c.B))"
            break
        }
    }
}
$src.Dispose()
