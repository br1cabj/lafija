# Generates LA FIJA PWA icons from scripts/icon-source.png (logo with transparency).
# Composes the icons on the app's dark background. Pure .NET, no external deps.
#
# Usage: pwsh scripts/generate-icons.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $root 'scripts\icon-source.png'
$outDir = Join-Path $root 'public\icons'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Add-Type -AssemblyName System.Drawing
$drawingCommon = Join-Path (Split-Path -Parent (Get-Command pwsh).Source) 'System.Drawing.Common.dll'
Add-Type -ReferencedAssemblies @('System.Drawing', $drawingCommon, 'System.Drawing.Primitives', 'System.Runtime', 'System.Private.CoreLib') -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class IconProcessor
{
    public static byte[] GetPixels(Bitmap b, out int w, out int h)
    {
        w = b.Width; h = b.Height;
        BitmapData d = b.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        byte[] buf = new byte[w * h * 4];
        for (int y = 0; y < h; y++)
            Marshal.Copy(new IntPtr(d.Scan0.ToInt64() + y * d.Stride), buf, y * w * 4, w * 4);
        b.UnlockBits(d);
        return buf;
    }

    // Bounding box of pixels with alpha > 16. Returns [x, y, w, h].
    public static int[] BoundingBox(byte[] px, int w, int h)
    {
        int minX = w, minY = h, maxX = -1, maxY = -1;
        for (int y = 0; y < h; y++)
            for (int x = 0; x < w; x++)
            {
                if (px[(y * w + x) * 4 + 3] > 16)
                {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        if (maxX < 0) throw new InvalidOperationException("Image is fully transparent");
        return new int[] { minX, minY, maxX - minX + 1, maxY - minY + 1 };
    }
}
'@

function Resize-Bitmap([System.Drawing.Bitmap]$src, [int]$maxDim) {
    $scale = [Math]::Min(1.0, $maxDim / [Math]::Max($src.Width, $src.Height))
    $w = [Math]::Max(1, [int]($src.Width * $scale))
    $h = [Math]::Max(1, [int]($src.Height * $scale))
    $dst = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dst)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($src, 0, 0, $w, $h)
    $g.Dispose()
    return $dst
}

function Compose-Icon([System.Drawing.Bitmap]$logo, [int]$size, [double]$logoFraction, [int]$bgR, [int]$bgG, [int]$bgB) {
    $icon = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($icon)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.Clear([System.Drawing.Color]::FromArgb(255, $bgR, $bgG, $bgB))

    # Logo fits in a centered square of logoFraction * size, keeping aspect
    $box = [int]($size * $logoFraction)
    $scale = [Math]::Min($box / [double]$logo.Width, $box / [double]$logo.Height)
    $dw = [int]($logo.Width * $scale)
    $dh = [int]($logo.Height * $scale)
    $dx = [int](($size - $dw) / 2)
    $dy = [int](($size - $dh) / 2)
    $g.DrawImage($logo, $dx, $dy, $dw, $dh)
    $g.Dispose()
    return $icon
}

Write-Host 'Procesando icono fuente...'
$source = [System.Drawing.Bitmap]::new($sourcePath)

# Recorte al contenido visible (alpha > 16) con margen de 1%
[int]$w = 0; [int]$h = 0
$px = [IconProcessor]::GetPixels($source, [ref]$w, [ref]$h)
$bbox = [IconProcessor]::BoundingBox($px, $w, $h)
$margin = [Math]::Max(4, [int]($bbox[2] * 0.01))
$mx = [Math]::Max(0, $bbox[0] - $margin); $my = [Math]::Max(0, $bbox[1] - $margin)
$mw = [Math]::Min($w - $mx, $bbox[2] + $margin * 2); $mh = [Math]::Min($h - $my, $bbox[3] + $margin * 2)
$cropped = $source.Clone([System.Drawing.Rectangle]::new($mx, $my, $mw, $mh), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$source.Dispose()
Write-Host "  Contenido recortado: ${mw}x${mh}"

# Logo transparente para uso dentro de la app
$logo256 = Resize-Bitmap $cropped 256
$logo256.Save((Join-Path $outDir 'logo.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$logo256.Dispose()
Write-Host '  logo.png OK'

# Iconos PWA sobre fondo oscuro de la app (#0B0C10)
$targets = @(
    @{ name = 'icon-192.png';          size = 192; frac = 0.80 },
    @{ name = 'icon-512.png';          size = 512; frac = 0.80 },
    @{ name = 'icon-maskable-512.png'; size = 512; frac = 0.58 },
    @{ name = 'favicon.png';           size = 64;  frac = 0.84 }
)
foreach ($t in $targets) {
    $icon = Compose-Icon $cropped $t.size $t.frac 11 12 16
    $path = if ($t.name -eq 'favicon.png') { Join-Path $root 'public\favicon.png' } else { Join-Path $outDir $t.name }
    $icon.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $icon.Dispose()
    Write-Host "  $($t.name) OK"
}
$cropped.Dispose()
Write-Host 'Iconos generados en public/icons/'
