$apiKey = $env:STITCH_API_KEY
if (-not $apiKey) { Write-Error "Set `$env:STITCH_API_KEY first (never commit keys)."; exit 1 }
$projectId = "7341961731937648866"
$screenIds = @(
    "ffd41170f4414d3ea15730f298c5176a",
    "8135f72bbe3f426badbd26727d80444c",
    "6e237a70903b42f797e4662b9a7bfd9e",
    "cf14eb49044648148365fc354cb35fa3"
)

$headers = @{
    "X-Goog-Api-Key" = $apiKey
}

New-Item -ItemType Directory -Force -Path "stitch_assets_new" | Out-Null

foreach ($screenId in $screenIds) {
    Write-Host "Fetching screen: $screenId"
    $url = "https://stitch.googleapis.com/v1/projects/$projectId/screens/$screenId"
    
    try {
        $response = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
        
        $screenJsonPath = Join-Path "stitch_assets_new" "$screenId.json"
        $response | ConvertTo-Json -Depth 10 | Out-File -FilePath $screenJsonPath -Encoding utf8
        
        if ($response.htmlCode.downloadUrl) {
            $htmlUrl = $response.htmlCode.downloadUrl
            $htmlPath = Join-Path "stitch_assets_new" "$screenId.html"
            Write-Host "Downloading HTML to $htmlPath"
            Invoke-RestMethod -Uri $htmlUrl -Method Get -OutFile $htmlPath
        }
        
        if ($response.screenshot.downloadUrl) {
            $imgUrl = $response.screenshot.downloadUrl
            $imgPath = Join-Path "stitch_assets_new" "$screenId.png"
            Write-Host "Downloading Image to $imgPath"
            Invoke-RestMethod -Uri $imgUrl -Method Get -OutFile $imgPath
        }
    } catch {
        Write-Host "Error fetching $screenId : $_"
    }
}
Write-Host "Done downloading assets."
