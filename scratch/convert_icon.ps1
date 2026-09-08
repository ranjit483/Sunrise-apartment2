Add-Type -AssemblyName System.Drawing

$src = "C:\Users\cwc\.gemini\antigravity\brain\d78e79cf-67de-460c-97f5-3f7f98aed426\.user_uploaded\media_1788845133166.jpg"
$img = [System.Drawing.Image]::FromFile($src)

function Resize-Image($sourceImg, $width, $height, $targetPath) {
    $destRect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
    $destImage = New-Object System.Drawing.Bitmap($width, $height)
    $destImage.SetResolution($sourceImg.HorizontalResolution, $sourceImg.VerticalResolution)

    $graphics = [System.Drawing.Graphics]::FromImage($destImage)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $graphics.DrawImage($sourceImg, $destRect, 0, 0, $sourceImg.Width, $sourceImg.Height, [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.Dispose()

    $destImage.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destImage.Dispose()
    Write-Host "Created $targetPath ($width x $height)"
}

# Copy original logo.jpg
Copy-Item $src "c:\Users\cwc\Desktop\opencode\public\logo.jpg" -Force

# Create PWA PNG Icons
Resize-Image $img 192 192 "c:\Users\cwc\Desktop\opencode\public\icon-192.png"
Resize-Image $img 512 512 "c:\Users\cwc\Desktop\opencode\public\icon-512.png"
Resize-Image $img 180 180 "c:\Users\cwc\Desktop\opencode\public\apple-touch-icon.png"
Resize-Image $img 32 32 "c:\Users\cwc\Desktop\opencode\public\favicon.png"

$img.Dispose()
Write-Host "All icons generated successfully!"
