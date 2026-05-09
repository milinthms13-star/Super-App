Add-Type -AssemblyName System.Drawing

$script:Palette = @{
  Ink = [System.Drawing.ColorTranslator]::FromHtml("#152033")
  Muted = [System.Drawing.ColorTranslator]::FromHtml("#5b6b7f")
  Line = [System.Drawing.ColorTranslator]::FromHtml("#d7dfea")
  Panel = [System.Drawing.ColorTranslator]::FromHtml("#f5f7fb")
  White = [System.Drawing.Color]::White
  Accent = [System.Drawing.ColorTranslator]::FromHtml("#0d7a5f")
  AccentSoft = [System.Drawing.ColorTranslator]::FromHtml("#dff4ee")
  Blue = [System.Drawing.ColorTranslator]::FromHtml("#0f4c81")
  BlueSoft = [System.Drawing.ColorTranslator]::FromHtml("#dce9f7")
  Amber = [System.Drawing.ColorTranslator]::FromHtml("#b66911")
  AmberSoft = [System.Drawing.ColorTranslator]::FromHtml("#fff1db")
  Coral = [System.Drawing.ColorTranslator]::FromHtml("#c24d4d")
  CoralSoft = [System.Drawing.ColorTranslator]::FromHtml("#fde7e7")
  Lavender = [System.Drawing.ColorTranslator]::FromHtml("#6750a4")
  LavenderSoft = [System.Drawing.ColorTranslator]::FromHtml("#ece6ff")
}

function New-Brush([System.Drawing.Color]$Color) {
  return New-Object System.Drawing.SolidBrush($Color)
}

function New-Pen([System.Drawing.Color]$Color, [float]$Width = 1) {
  return New-Object System.Drawing.Pen($Color, $Width)
}

function Get-RoundedPath([float]$X, [float]$Y, [float]$Width, [float]$Height, [float]$Radius) {
  $diameter = $Radius * 2
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function Fill-RoundedRect($Graphics, [float]$X, [float]$Y, [float]$Width, [float]$Height, [float]$Radius, $Brush, $Pen = $null) {
  $path = Get-RoundedPath $X $Y $Width $Height $Radius
  $Graphics.FillPath($Brush, $path)
  if ($Pen) {
    $Graphics.DrawPath($Pen, $path)
  }
  $path.Dispose()
}

function Draw-Label($Graphics, [string]$Text, [float]$X, [float]$Y, [float]$Width, [float]$Height, $Font, $Brush, [string]$Align = "Near") {
  $rect = New-Object System.Drawing.RectangleF($X, $Y, $Width, $Height)
  $format = New-Object System.Drawing.StringFormat
  switch ($Align) {
    "Center" { $format.Alignment = [System.Drawing.StringAlignment]::Center }
    "Far" { $format.Alignment = [System.Drawing.StringAlignment]::Far }
    default { $format.Alignment = [System.Drawing.StringAlignment]::Near }
  }
  $format.LineAlignment = [System.Drawing.StringAlignment]::Near
  $Graphics.DrawString($Text, $Font, $Brush, $rect, $format)
  $format.Dispose()
}

function New-Canvas([int]$Width, [int]$Height) {
  $bitmap = New-Object System.Drawing.Bitmap($Width, $Height)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml("#eef2f7"))

  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Rectangle(0, 0, $Width, $Height)),
    [System.Drawing.Color]::White,
    [System.Drawing.ColorTranslator]::FromHtml("#edf4ff"),
    45
  )
  $graphics.FillRectangle($brush, 0, 0, $Width, $Height)
  $brush.Dispose()

  return @{
    Bitmap = $bitmap
    Graphics = $graphics
    Width = $Width
    Height = $Height
  }
}

function Save-Canvas($Canvas, [string]$Path) {
  $dir = Split-Path -Parent $Path
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  $Canvas.Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $Canvas.Graphics.Dispose()
  $Canvas.Bitmap.Dispose()
}

function Draw-BrowserShell($Graphics, [int]$Width, [int]$Height, [string]$Title) {
  $shadowBrush = New-Brush ([System.Drawing.Color]::FromArgb(30, 21, 32, 51))
  Fill-RoundedRect $Graphics 54 42 ($Width - 108) ($Height - 84) 24 $shadowBrush
  $shadowBrush.Dispose()

  $windowBrush = New-Brush $script:Palette.White
  $linePen = New-Pen $script:Palette.Line 1
  Fill-RoundedRect $Graphics 48 36 ($Width - 96) ($Height - 92) 24 $windowBrush $linePen
  $windowBrush.Dispose()
  $linePen.Dispose()

  $topBrush = New-Brush ([System.Drawing.ColorTranslator]::FromHtml("#f8fafc"))
  Fill-RoundedRect $Graphics 48 36 ($Width - 96) 58 24 $topBrush
  $topBrush.Dispose()

  $circleColors = @("#ff5f56", "#ffbd2e", "#27c93f")
  for ($i = 0; $i -lt $circleColors.Count; $i++) {
    $brush = New-Brush ([System.Drawing.ColorTranslator]::FromHtml($circleColors[$i]))
    $Graphics.FillEllipse($brush, 72 + ($i * 18), 57, 10, 10)
    $brush.Dispose()
  }

  $addressBrush = New-Brush ([System.Drawing.ColorTranslator]::FromHtml("#edf2f7"))
  $addressPen = New-Pen ([System.Drawing.ColorTranslator]::FromHtml("#d6dde7")) 1
  Fill-RoundedRect $Graphics 150 49 860 26 13 $addressBrush $addressPen
  $addressBrush.Dispose()
  $addressPen.Dispose()

  $font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Regular)
  $brush = New-Brush $script:Palette.Muted
  Draw-Label $Graphics $Title 168 54 820 20 $font $brush
  $font.Dispose()
  $brush.Dispose()
}

function Draw-PhoneShell($Graphics, [int]$Width, [int]$Height, [string]$Title) {
  $outerBrush = New-Brush ([System.Drawing.ColorTranslator]::FromHtml("#0f172a"))
  Fill-RoundedRect $Graphics 80 24 ($Width - 160) ($Height - 48) 42 $outerBrush
  $outerBrush.Dispose()

  $innerBrush = New-Brush $script:Palette.White
  Fill-RoundedRect $Graphics 96 46 ($Width - 192) ($Height - 92) 34 $innerBrush
  $innerBrush.Dispose()

  $notchBrush = New-Brush ([System.Drawing.ColorTranslator]::FromHtml("#0f172a"))
  Fill-RoundedRect $Graphics (($Width / 2) - 72) 56 144 24 12 $notchBrush
  $notchBrush.Dispose()

  $font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
  $brush = New-Brush $script:Palette.Ink
  Draw-Label $Graphics $Title 118 98 ($Width - 236) 24 $font $brush
  $font.Dispose()
  $brush.Dispose()
}

function Draw-TopHeadline($Graphics, [string]$Eyebrow, [string]$Title, [string]$Subtitle, [int]$X, [int]$Y, [int]$Width) {
  $eyebrowBrush = New-Brush $script:Palette.AccentSoft
  Fill-RoundedRect $Graphics $X $Y 160 26 13 $eyebrowBrush
  $eyebrowBrush.Dispose()

  $eyebrowFont = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
  $accentBrush = New-Brush $script:Palette.Accent
  Draw-Label $Graphics $Eyebrow ($X + 14) ($Y + 6) 132 18 $eyebrowFont $accentBrush
  $eyebrowFont.Dispose()
  $accentBrush.Dispose()

  $titleFont = New-Object System.Drawing.Font("Segoe UI", 24, [System.Drawing.FontStyle]::Bold)
  $inkBrush = New-Brush $script:Palette.Ink
  Draw-Label $Graphics $Title $X ($Y + 40) $Width 40 $titleFont $inkBrush
  $titleFont.Dispose()
  $inkBrush.Dispose()

  $subFont = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Regular)
  $mutedBrush = New-Brush $script:Palette.Muted
  Draw-Label $Graphics $Subtitle $X ($Y + 84) $Width 48 $subFont $mutedBrush
  $subFont.Dispose()
  $mutedBrush.Dispose()
}

function Draw-StatCard($Graphics, [int]$X, [int]$Y, [int]$Width, [int]$Height, [string]$Label, [string]$Value, [System.Drawing.Color]$Tint) {
  $soft = [System.Drawing.Color]::FromArgb(24, $Tint.R, $Tint.G, $Tint.B)
  $brush = New-Brush $soft
  $pen = New-Pen ([System.Drawing.Color]::FromArgb(60, $Tint.R, $Tint.G, $Tint.B)) 1
  Fill-RoundedRect $Graphics $X $Y $Width $Height 18 $brush $pen
  $brush.Dispose()
  $pen.Dispose()

  $labelFont = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
  $valueFont = New-Object System.Drawing.Font("Segoe UI", 20, [System.Drawing.FontStyle]::Bold)
  $mutedBrush = New-Brush $script:Palette.Muted
  $valueBrush = New-Brush $script:Palette.Ink
  Draw-Label $Graphics $Label ($X + 18) ($Y + 14) ($Width - 36) 16 $labelFont $mutedBrush
  Draw-Label $Graphics $Value ($X + 18) ($Y + 34) ($Width - 36) 26 $valueFont $valueBrush
  $labelFont.Dispose()
  $valueFont.Dispose()
  $mutedBrush.Dispose()
  $valueBrush.Dispose()
}

function Draw-ModuleCard($Graphics, [int]$X, [int]$Y, [int]$Width, [int]$Height, [string]$Title, [string]$Body, [System.Drawing.Color]$Accent) {
  $brush = New-Brush $script:Palette.White
  $pen = New-Pen $script:Palette.Line 1
  Fill-RoundedRect $Graphics $X $Y $Width $Height 18 $brush $pen
  $brush.Dispose()
  $pen.Dispose()

  $accentBrush = New-Brush ([System.Drawing.Color]::FromArgb(24, $Accent.R, $Accent.G, $Accent.B))
  Fill-RoundedRect $Graphics ($X + 18) ($Y + 18) 54 54 16 $accentBrush
  $accentBrush.Dispose()

  $titleFont = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
  $bodyFont = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Regular)
  $inkBrush = New-Brush $script:Palette.Ink
  $mutedBrush = New-Brush $script:Palette.Muted
  Draw-Label $Graphics $Title ($X + 88) ($Y + 20) ($Width - 106) 18 $titleFont $inkBrush
  Draw-Label $Graphics $Body ($X + 88) ($Y + 44) ($Width - 106) 34 $bodyFont $mutedBrush
  $titleFont.Dispose()
  $bodyFont.Dispose()
  $inkBrush.Dispose()
  $mutedBrush.Dispose()
}

function Draw-ListRow($Graphics, [int]$X, [int]$Y, [int]$Width, [string]$Left, [string]$Right) {
  $pen = New-Pen $script:Palette.Line 1
  $Graphics.DrawLine($pen, $X, $Y + 42, $X + $Width, $Y + 42)
  $pen.Dispose()
  $leftFont = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Regular)
  $rightFont = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
  $mutedBrush = New-Brush $script:Palette.Muted
  $inkBrush = New-Brush $script:Palette.Ink
  Draw-Label $Graphics $Left $X ($Y + 8) ($Width * 0.7) 18 $leftFont $mutedBrush
  Draw-Label $Graphics $Right ($X + ($Width * 0.7)) ($Y + 8) ($Width * 0.3 - 6) 18 $rightFont $inkBrush "Far"
  $leftFont.Dispose()
  $rightFont.Dispose()
  $mutedBrush.Dispose()
  $inkBrush.Dispose()
}

function Draw-Tag($Graphics, [int]$X, [int]$Y, [string]$Text, [System.Drawing.Color]$FillColor, [System.Drawing.Color]$TextColor) {
  $font = New-Object System.Drawing.Font("Segoe UI", 8, [System.Drawing.FontStyle]::Bold)
  $tempBmp = New-Object System.Drawing.Bitmap 1,1
  $tempGraphics = [System.Drawing.Graphics]::FromImage($tempBmp)
  $size = $tempGraphics.MeasureString($Text, $font)
  $tempGraphics.Dispose()
  $tempBmp.Dispose()

  $brush = New-Brush $FillColor
  Fill-RoundedRect $Graphics $X $Y ([int]$size.Width + 18) 24 12 $brush
  $brush.Dispose()
  $textBrush = New-Brush $TextColor
  Draw-Label $Graphics $Text ($X + 9) ($Y + 6) ([int]$size.Width + 2) 14 $font $textBrush
  $font.Dispose()
  $textBrush.Dispose()
}

function Draw-MapPanel($Graphics, [int]$X, [int]$Y, [int]$Width, [int]$Height) {
  $brush = New-Brush ([System.Drawing.ColorTranslator]::FromHtml("#eef5ff"))
  $pen = New-Pen ([System.Drawing.ColorTranslator]::FromHtml("#c7d7ef")) 1
  Fill-RoundedRect $Graphics $X $Y $Width $Height 20 $brush $pen
  $brush.Dispose()
  $pen.Dispose()

  $routePen = New-Pen ([System.Drawing.ColorTranslator]::FromHtml("#0d7a5f")) 4
  $Graphics.DrawBezier($routePen, $X + 50, $Y + 190, $X + 140, $Y + 60, $X + 280, $Y + 250, $X + $Width - 80, $Y + 110)
  $routePen.Dispose()

  $startBrush = New-Brush ([System.Drawing.ColorTranslator]::FromHtml("#0d7a5f"))
  $endBrush = New-Brush ([System.Drawing.ColorTranslator]::FromHtml("#c24d4d"))
  $Graphics.FillEllipse($startBrush, $X + 40, $Y + 180, 22, 22)
  $Graphics.FillEllipse($endBrush, $X + $Width - 92, $Y + 98, 22, 22)
  $startBrush.Dispose()
  $endBrush.Dispose()
}

function Draw-Preview-Screen([string]$Path, [scriptblock]$Painter, [int]$Width = 1440, [int]$Height = 900) {
  $canvas = New-Canvas $Width $Height
  & $Painter $canvas.Graphics $Width $Height
  Save-Canvas $canvas $Path
}

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root "docs\investor-screenshots"

Draw-Preview-Screen (Join-Path $outDir "01-launch-login.png") {
  param($g, $w, $h)
  Draw-BrowserShell $g $w $h "http://nilahub.app/launch"
  Draw-TopHeadline $g "Investor Preview" "NilaHub Launch Experience" "A branded super-app entry point designed for marketplace, messaging, services, and everyday utilities." 110 120 880
  Draw-Tag $g 110 250 "Web + Android + Desktop" $script:Palette.AccentSoft $script:Palette.Accent
  Draw-Tag $g 286 250 "Multi-language" $script:Palette.BlueSoft $script:Palette.Blue
  Draw-Tag $g 430 250 "Investor screenshot asset" $script:Palette.AmberSoft $script:Palette.Amber
  Draw-ModuleCard $g 110 308 250 120 "User Login" "OTP login, identity-based onboarding, and polished entry actions." $script:Palette.Accent
  Draw-ModuleCard $g 380 308 250 120 "Entrepreneur Access" "Seller and operator registration flows inside the same shell." $script:Palette.Blue
  Draw-ModuleCard $g 650 308 250 120 "Admin Access" "Governance and operations panels behind role-based access." $script:Palette.Lavender
  Draw-ModuleCard $g 920 308 250 120 "Kerala-first Modules" "Commerce, rides, reminders, safety, and community features." $script:Palette.Amber
  Draw-StatCard $g 110 466 240 110 "Modules surfaced" "12+" $script:Palette.Accent
  Draw-StatCard $g 370 466 240 110 "Investor-ready flows" "Core UX" $script:Palette.Blue
  Draw-StatCard $g 630 466 240 110 "Platforms" "3" $script:Palette.Lavender
  Draw-StatCard $g 890 466 280 110 "Current asset status" "Preview added" $script:Palette.Amber
}

Draw-Preview-Screen (Join-Path $outDir "02-dashboard.png") {
  param($g, $w, $h)
  Draw-BrowserShell $g $w $h "http://nilahub.app/dashboard"
  Draw-TopHeadline $g "Live Product View" "Unified Dashboard" "A single operating shell connecting commerce, messaging, rides, reminders, safety, and community modules." 110 118 900
  Draw-StatCard $g 110 246 230 104 "Active modules" "12" $script:Palette.Accent
  Draw-StatCard $g 358 246 230 104 "Pending alerts" "3" $script:Palette.Coral
  Draw-StatCard $g 606 246 230 104 "Open actions" "14" $script:Palette.Blue
  Draw-StatCard $g 854 246 316 104 "Super-app readiness" "High" $script:Palette.Lavender
  Draw-ModuleCard $g 110 386 260 118 "GlobeMart" "Products, checkout, subscriptions, and seller flows." $script:Palette.Accent
  Draw-ModuleCard $g 390 386 260 118 "LinkUp Messaging" "Conversations, delivery indicators, and AI reply surfaces." $script:Palette.Blue
  Draw-ModuleCard $g 670 386 260 118 "SwiftRide" "Ride booking, live tracking, ratings, and SOS tooling." $script:Palette.Lavender
  Draw-ModuleCard $g 950 386 220 118 "ReminderAlert" "Repeat-utility workspace for reminders and tasks." $script:Palette.Amber
  Draw-ModuleCard $g 110 528 260 118 "Feastly" "Restaurant discovery and delivery operations." $script:Palette.Coral
  Draw-ModuleCard $g 390 528 260 118 "SoulMatch" "Verified matchmaking profiles and subscriptions." $script:Palette.Blue
  Draw-ModuleCard $g 670 528 260 118 "SOS Safety Center" "Escalation-ready trust and safety workflows." $script:Palette.Coral
  Draw-ModuleCard $g 950 528 220 118 "AstroNila" "Daily insights and personal guidance utilities." $script:Palette.Lavender
}

Draw-Preview-Screen (Join-Path $outDir "03-messaging-chat.png") {
  param($g, $w, $h)
  Draw-BrowserShell $g $w $h "http://nilahub.app/messaging"
  Draw-TopHeadline $g "Engagement Loop" "Messaging and AI Reply Surface" "High-frequency communication layer with delivery state, live conversation context, and assistant-ready suggestions." 100 108 920
  Draw-ModuleCard $g 104 250 280 520 "Chat List" "Recent conversations, unread state, and quick access for power users." $script:Palette.Blue
  Draw-ModuleCard $g 408 250 540 520 "Conversation" "Message thread with timestamps, sent state, read state, and multi-party flow." $script:Palette.Accent
  Draw-ModuleCard $g 972 250 260 520 "AI Suggestions" "Suggested replies, next actions, and intent-aware prompts." $script:Palette.Lavender
  Draw-ListRow $g 130 320 228 "Anjana - order update" "Seen"
  Draw-ListRow $g 130 364 228 "Niyas - driver ETA" "2m"
  Draw-ListRow $g 130 408 228 "Ops room - moderation" "4 unread"
  $chatBrush = New-Brush ([System.Drawing.ColorTranslator]::FromHtml("#eef7ff"))
  Fill-RoundedRect $g 446 320 320 58 18 $chatBrush
  $chatBrush.Dispose()
  $chatFont = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Regular)
  $inkBrush = New-Brush $script:Palette.Ink
  Draw-Label $g "Courier confirmed. Your order is out for delivery." 468 338 280 18 $chatFont $inkBrush
  $replyBrush = New-Brush ([System.Drawing.ColorTranslator]::FromHtml("#dff4ee"))
  Fill-RoundedRect $g 594 402 300 58 18 $replyBrush
  $replyBrush.Dispose()
  Draw-Label $g "Perfect. Share live location once you are close." 616 420 250 18 $chatFont $inkBrush
  Draw-Tag $g 996 330 "Reply with ETA" $script:Palette.AccentSoft $script:Palette.Accent
  Draw-Tag $g 996 364 "Offer smart reply" $script:Palette.BlueSoft $script:Palette.Blue
  Draw-Tag $g 996 398 "Escalate to admin" $script:Palette.AmberSoft $script:Palette.Amber
  $chatFont.Dispose()
  $inkBrush.Dispose()
}

Draw-Preview-Screen (Join-Path $outDir "04-admin-dashboard.png") {
  param($g, $w, $h)
  Draw-BrowserShell $g $w $h "http://nilahub.app/admin-dashboard"
  Draw-TopHeadline $g "Governance View" "Admin Dashboard" "Operations, moderation, pricing control, and registration oversight from one admin surface." 110 112 900
  Draw-StatCard $g 110 244 220 100 "Pending approvals" "18" $script:Palette.Coral
  Draw-StatCard $g 348 244 220 100 "Moderation queue" "7" $script:Palette.Amber
  Draw-StatCard $g 586 244 220 100 "Revenue potential" "INR 74K" $script:Palette.Accent
  Draw-StatCard $g 824 244 346 100 "Enabled modules" "12 / 12" $script:Palette.Blue
  Draw-ModuleCard $g 110 382 500 310 "Registration Queue" "Business applications, fee visibility, and approval actions are organized for rapid operator review." $script:Palette.Coral
  Draw-ModuleCard $g 640 382 530 310 "Governance and Catalog Controls" "Category fees, subcategories, moderation notes, and module toggles sit inside a single review surface." $script:Palette.Blue
  Draw-ListRow $g 138 470 444 "Akhil Foods - food delivery" "Pending"
  Draw-ListRow $g 138 514 444 "Kochi Swift Cabs - ridesharing" "Approved"
  Draw-ListRow $g 138 558 444 "Kerala Crafts - ecommerce" "Review"
  Draw-Tag $g 668 470 "Fee control" $script:Palette.BlueSoft $script:Palette.Blue
  Draw-Tag $g 778 470 "Subcategories" $script:Palette.AccentSoft $script:Palette.Accent
  Draw-Tag $g 914 470 "Module toggles" $script:Palette.LavenderSoft $script:Palette.Lavender
}

Draw-Preview-Screen (Join-Path $outDir "05-ecommerce-marketplace.png") {
  param($g, $w, $h)
  Draw-BrowserShell $g $w $h "http://nilahub.app/ecommerce"
  Draw-TopHeadline $g "Commerce Layer" "Marketplace and Discovery" "Product discovery, category browsing, seller surfaces, and purchase intent all live inside the same consumer app." 110 112 900
  Draw-Tag $g 110 250 "Kerala Snacks" $script:Palette.AccentSoft $script:Palette.Accent
  Draw-Tag $g 240 250 "Home Essentials" $script:Palette.BlueSoft $script:Palette.Blue
  Draw-Tag $g 392 250 "Best sellers" $script:Palette.AmberSoft $script:Palette.Amber
  Draw-Tag $g 510 250 "Subscriptions" $script:Palette.LavenderSoft $script:Palette.Lavender
  Draw-ModuleCard $g 110 300 260 280 "Banana Chips" "Fast-moving local product with ratings, offer price, and conversion-friendly presentation." $script:Palette.Amber
  Draw-ModuleCard $g 390 300 260 280 "Pickle Combo" "Bundled product card with pricing and quick-add buyer intent flow." $script:Palette.Coral
  Draw-ModuleCard $g 670 300 260 280 "Kerala Gift Box" "Higher-value cartable item with premium positioning." $script:Palette.Blue
  Draw-ModuleCard $g 950 300 220 280 "Quick Cart" "Sticky cart summary, delivery promise, and total value." $script:Palette.Accent
  Draw-StatCard $g 110 620 220 96 "Visible products" "24" $script:Palette.Accent
  Draw-StatCard $g 348 620 220 96 "Offer cards" "6" $script:Palette.Blue
  Draw-StatCard $g 586 620 220 96 "Cart actions" "Live" $script:Palette.Amber
  Draw-StatCard $g 824 620 346 96 "Investor proof angle" "Monetization + discovery" $script:Palette.Lavender
}

Draw-Preview-Screen (Join-Path $outDir "06-wallet-payments.png") {
  param($g, $w, $h)
  Draw-BrowserShell $g $w $h "http://nilahub.app/wallet"
  Draw-TopHeadline $g "Monetization Surface" "Wallet and Payments" "A visible transaction layer for wallet balance, top-ups, credits, debits, and payment method control." 110 112 900
  Draw-StatCard $g 110 250 300 122 "Wallet balance" "INR 8,450" $script:Palette.Accent
  Draw-StatCard $g 430 250 220 122 "Pending refund" "INR 420" $script:Palette.Amber
  Draw-StatCard $g 670 250 220 122 "Methods active" "4" $script:Palette.Blue
  Draw-StatCard $g 910 250 260 122 "Settlement status" "Healthy" $script:Palette.Lavender
  Draw-ModuleCard $g 110 414 500 266 "Transaction Ledger" "Credits, debits, refunds, ride payments, and order settlements are captured in one financial surface." $script:Palette.Blue
  Draw-ModuleCard $g 640 414 530 266 "Payment Methods" "UPI, Card, Wallet, and Cash surfaces are visible for investor-facing monetization proof." $script:Palette.Accent
  Draw-ListRow $g 138 500 444 "Wallet top-up - UPI" "+ INR 2,000"
  Draw-ListRow $g 138 544 444 "Ride payment - SwiftRide" "- INR 248"
  Draw-ListRow $g 138 588 444 "Refund - cancelled order" "+ INR 420"
  Draw-Tag $g 668 500 "UPI" $script:Palette.AccentSoft $script:Palette.Accent
  Draw-Tag $g 730 500 "Card" $script:Palette.BlueSoft $script:Palette.Blue
  Draw-Tag $g 802 500 "Wallet" $script:Palette.AmberSoft $script:Palette.Amber
  Draw-Tag $g 892 500 "Cash" $script:Palette.LavenderSoft $script:Palette.Lavender
}

Draw-Preview-Screen (Join-Path $outDir "07-ridesharing-booking.png") {
  param($g, $w, $h)
  Draw-BrowserShell $g $w $h "http://nilahub.app/ridesharing"
  Draw-TopHeadline $g "Service Marketplace" "Ride Booking Flow" "Booking, ETA, driver assignment, payment method choice, and ride operations in a single consumer workflow." 110 112 900
  Draw-MapPanel $g 740 250 430 420
  Draw-ModuleCard $g 110 250 290 180 "Trip Form" "Pickup, drop, ride type, and payment method capture." $script:Palette.Accent
  Draw-ModuleCard $g 420 250 290 180 "Fare Estimate" "Bike, Auto, and Car offers with ETA and comfort framing." $script:Palette.Blue
  Draw-ModuleCard $g 110 454 290 216 "Assigned Driver" "Verified captain details, rating, and service zone." $script:Palette.Lavender
  Draw-ModuleCard $g 420 454 290 216 "Trip Promise" "Cashless options, support loop, and route visibility." $script:Palette.Amber
  Draw-StatCard $g 110 700 190 92 "Ride types" "3" $script:Palette.Accent
  Draw-StatCard $g 320 700 190 92 "ETA range" "2-5m" $script:Palette.Blue
  Draw-StatCard $g 530 700 180 92 "Safety" "Built-in" $script:Palette.Coral
  Draw-StatCard $g 740 700 430 92 "Investor proof angle" "Services + payments + trust" $script:Palette.Lavender
}

Draw-Preview-Screen (Join-Path $outDir "08-ridesharing-tracking.png") {
  param($g, $w, $h)
  Draw-BrowserShell $g $w $h "http://nilahub.app/ridesharing/live"
  Draw-TopHeadline $g "Real-Time UX" "Live Ride Tracking" "Map visibility, arrival confidence, route awareness, and active-trip reassurance for both rider and platform." 110 112 900
  Draw-MapPanel $g 100 250 660 470
  Draw-ModuleCard $g 790 250 370 180 "Driver Status" "Approaching pickup, time-to-arrival, and live trip state updates." $script:Palette.Blue
  Draw-ModuleCard $g 790 454 370 130 "Route Intelligence" "Trip distance, route health, and change awareness while the ride is active." $script:Palette.Accent
  Draw-ModuleCard $g 790 604 370 116 "Trip Controls" "Share trip, raise SOS, and view ride log from one action surface." $script:Palette.Coral
}

Draw-Preview-Screen (Join-Path $outDir "09-sos-safety.png") {
  param($g, $w, $h)
  Draw-BrowserShell $g $w $h "http://nilahub.app/sosalert"
  Draw-TopHeadline $g "Trust and Safety" "Emergency Response Workflow" "A differentiated safety layer with escalation, trusted contacts, live location context, and visible response sequencing." 110 112 900
  Draw-StatCard $g 110 254 240 108 "SOS contacts" "5" $script:Palette.Coral
  Draw-StatCard $g 370 254 240 108 "Location refresh" "Live" $script:Palette.Accent
  Draw-StatCard $g 630 254 240 108 "Escalation mode" "Enabled" $script:Palette.Amber
  Draw-StatCard $g 890 254 280 108 "Support status" "Monitoring" $script:Palette.Blue
  Draw-ModuleCard $g 110 402 360 278 "Incident Panel" "Emergency reason, time, and action buttons for immediate response." $script:Palette.Coral
  Draw-ModuleCard $g 490 402 300 278 "Trusted Contacts" "Primary reach list, acknowledgment status, and escalation sequencing." $script:Palette.Accent
  Draw-MapPanel $g 810 402 360 278
}

Draw-Preview-Screen (Join-Path $outDir "10-reminder-workspace.png") {
  param($g, $w, $h)
  Draw-BrowserShell $g $w $h "http://nilahub.app/reminderalert"
  Draw-TopHeadline $g "Utility and Retention" "Reminder Workspace" "A repeat-use productivity surface with reminder scheduling, tracking, filtering, and escalation behavior." 110 112 900
  Draw-StatCard $g 110 248 220 102 "Open reminders" "14" $script:Palette.Accent
  Draw-StatCard $g 348 248 220 102 "Due today" "5" $script:Palette.Coral
  Draw-StatCard $g 586 248 220 102 "Escalations armed" "2" $script:Palette.Amber
  Draw-StatCard $g 824 248 346 102 "Investor proof angle" "Retention utility" $script:Palette.Blue
  Draw-ModuleCard $g 110 388 320 300 "Create Reminder" "Schedule date, channel, category, and escalation logic from one workspace." $script:Palette.Accent
  Draw-ModuleCard $g 450 388 360 300 "Reminder List" "Prioritized tasks, due-time visibility, and completion controls." $script:Palette.Blue
  Draw-ModuleCard $g 830 388 340 300 "Analytics Panel" "Success metrics, pending follow-up, and habit-supporting visibility." $script:Palette.Lavender
}

Draw-Preview-Screen (Join-Path $outDir "11-diary-ai.png") {
  param($g, $w, $h)
  Draw-BrowserShell $g $w $h "http://nilahub.app/diary"
  Draw-TopHeadline $g "AI-Assisted Utility" "Diary and Insight Workspace" "A high-retention personal surface combining journaling, reflection, and AI-generated summaries or prompts." 110 112 900
  Draw-ModuleCard $g 110 252 360 430 "Writing Surface" "Entry title, mood context, and structured journal content in one focused editor." $script:Palette.Blue
  Draw-ModuleCard $g 490 252 320 430 "AI Insights" "Summary, themes, and suggested action items generated from recent entries." $script:Palette.Lavender
  Draw-ModuleCard $g 830 252 340 430 "Reflection Metrics" "Mood trends, streaks, and personal activity signals for repeat engagement." $script:Palette.Accent
  Draw-Tag $g 520 340 "Summary" $script:Palette.LavenderSoft $script:Palette.Lavender
  Draw-Tag $g 608 340 "Themes" $script:Palette.BlueSoft $script:Palette.Blue
  Draw-Tag $g 684 340 "Actions" $script:Palette.AccentSoft $script:Palette.Accent
}

Draw-Preview-Screen (Join-Path $outDir "12-mobile-app-shell.png") {
  param($g, $w, $h)
  Draw-PhoneShell $g $w $h "NilaHub mobile shell"
  Draw-TopHeadline $g "Mobile View" "NilaHub App Shell" "A compact mobile-ready surface showing module entry, persistent navigation, and portable app experience." 126 140 ($w - 252)
  Draw-ModuleCard $g 126 310 134 118 "GlobeMart" "Shop" $script:Palette.Accent
  Draw-ModuleCard $g 278 310 134 118 "LinkUp" "Chat" $script:Palette.Blue
  Draw-ModuleCard $g 430 310 134 118 "SwiftRide" "Ride" $script:Palette.Lavender
  Draw-ModuleCard $g 126 448 134 118 "Feastly" "Food" $script:Palette.Coral
  Draw-ModuleCard $g 278 448 134 118 "Reminder" "Plan" $script:Palette.Amber
  Draw-ModuleCard $g 430 448 134 118 "SOS" "Safe" $script:Palette.Coral
  Draw-StatCard $g 126 612 438 104 "Portable experience" "Android-ready shell with multi-module entry" $script:Palette.Blue
}

Write-Output "Generated investor preview images in $outDir"
