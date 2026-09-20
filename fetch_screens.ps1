$apiKey = $env:STITCH_API_KEY
if (-not $apiKey) { Write-Error "Set `$env:STITCH_API_KEY first (never commit keys)."; exit 1 }
$projectId = "7341961731937648866"
$screenIds = @(
    "asset-stub-assets_c296c98d34e14423994cbad493d0f35b",
    "23166e302bad496a8b5470950d7ca292",
    "3c117bf1ff26411bbfa4fd776f08042f",
    "550f0e628d8b40978431a12f3835bff2",
    "2cc6990a8f234ea582819f64b04e9729"
)

$headers = @{
    "X-Goog-Api-Key" = $apiKey
}

New-Item -ItemType Directory -Force -Path "stitch_assets" | Out-Null

foreach ($screenId in $screenIds) {
    Write-Host "Fetching screen: $screenId"
    $url = "https://stitch.googleapis.com/v1/projects/$projectId/screens/$screenId"
    
    try {
        $response = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
        
        $screenJsonPath = Join-Path "stitch_assets" "$screenId.json"
        $response | ConvertTo-Json -Depth 10 | Out-File -FilePath $screenJsonPath -Encoding utf8
        
        if ($response.htmlCode.downloadUrl) {
            $htmlUrl = $response.htmlCode.downloadUrl
            $htmlPath = Join-Path "stitch_assets" "$screenId.html"
            Write-Host "Downloading HTML to $htmlPath"
            Invoke-RestMethod -Uri $htmlUrl -Method Get -OutFile $htmlPath
        }
        
        if ($response.screenshot.downloadUrl) {
            $imgUrl = $response.screenshot.downloadUrl
            $imgPath = Join-Path "stitch_assets" "$screenId.png"
            Write-Host "Downloading Image to $imgPath"
            Invoke-RestMethod -Uri $imgUrl -Method Get -OutFile $imgPath
        }
    } catch {
        Write-Host "Error fetching $screenId : $_"
    }
}
Write-Host "Done downloading assets."
