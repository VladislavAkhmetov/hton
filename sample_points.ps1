Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Bitmap]::FromFile('C:\Users\amazi\.gemini\antigravity\brain\0c15a112-46e2-4d42-8724-fcf8cd8d6120\.user_uploaded\media_1792762555441_f6c866b3.jpg')

# Check coordinates
$points = @(
    @{ Name = 'LeftPillar'; X = 30; Y = 300 },
    @{ Name = 'WindshieldLeft'; X = 150; Y = 300 },
    @{ Name = 'WindshieldCenter'; X = 512; Y = 300 },
    @{ Name = 'MirrorCenter'; X = 860; Y = 220 },
    @{ Name = 'DashboardRight'; X = 800; Y = 750 },
    @{ Name = 'SteeringWheelTop'; X = 250; Y = 640 },
    @{ Name = 'HandGlove'; X = 220; Y = 760 },
    @{ Name = 'WiperCenter'; X = 600; Y = 590 },
    @{ Name = 'TopRoof'; X = 400; Y = 40 }
)

foreach ($p in $points) {
    $c = $src.GetPixel($p.X, $p.Y)
    Write-Output "$($p.Name) ($($p.X), $($p.Y)): R=$($c.R), G=$($c.G), B=$($c.B)"
}

$src.Dispose()
