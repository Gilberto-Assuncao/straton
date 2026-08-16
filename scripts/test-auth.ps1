[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [Console]::OutputEncoding

function Get-FirstConfiguredValue {
    param([string[]]$Names)

    foreach ($name in $Names) {
        $value = [Environment]::GetEnvironmentVariable($name)
        if (-not [string]::IsNullOrWhiteSpace($value)) {
            return $value.Trim()
        }
    }

    return $null
}

$apiUrl = Get-FirstConfiguredValue @(
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_URL",
    "API_URL"
)
$publishableKey = Get-FirstConfiguredValue @(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "PUBLISHABLE_KEY"
)

if ([string]::IsNullOrWhiteSpace($apiUrl) -or [string]::IsNullOrWhiteSpace($publishableKey)) {
    try {
        $statusLines = & cmd.exe /d /c "npx supabase@2.109.1 status --output env 2>&1"
        if ($LASTEXITCODE -eq 0) {
            $statusText = $statusLines | Out-String
            foreach ($line in ($statusText -split "`r?`n")) {
                if ($line -match '^API_URL="?([^"\r\n]+)"?$' -and [string]::IsNullOrWhiteSpace($apiUrl)) {
                    $apiUrl = $Matches[1]
                }
                if ($line -match '^PUBLISHABLE_KEY="?([^"\r\n]+)"?$' -and [string]::IsNullOrWhiteSpace($publishableKey)) {
                    $publishableKey = $Matches[1]
                }
            }
        }
    }
    catch {
        # The explicit validation below provides the actionable error.
    }
}

if ([string]::IsNullOrWhiteSpace($apiUrl)) {
    Write-Error "Supabase API URL is not configured. Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL."
    exit 2
}

if ([string]::IsNullOrWhiteSpace($publishableKey)) {
    Write-Error "Supabase Publishable Key is not configured. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or SUPABASE_PUBLISHABLE_KEY."
    exit 2
}

$users = @(
    @{ Label = "Admin"; Email = "admin@straton.local" },
    @{ Label = "Supervisor"; Email = "supervisor@straton.local" },
    @{ Label = "Employee"; Email = "employee@straton.local" }
)
$password = "straton-local-only"
$tokenEndpoint = "{0}/auth/v1/token?grant_type=password" -f $apiUrl.TrimEnd("/")
$hasFailure = $false
$successMark = [char]0x2713
$failureMark = [char]0x2717
Add-Type -AssemblyName System.Net.Http
$client = [System.Net.Http.HttpClient]::new()

try {
    $client.DefaultRequestHeaders.Add("apikey", $publishableKey)

    foreach ($user in $users) {
        $payload = @{
            email = $user.Email
            password = $password
        } | ConvertTo-Json -Compress
        $content = [System.Net.Http.StringContent]::new(
            $payload,
            [System.Text.Encoding]::UTF8,
            "application/json"
        )

        try {
            $response = $client.PostAsync($tokenEndpoint, $content).GetAwaiter().GetResult()
            $responseBody = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()

            if ($response.IsSuccessStatusCode) {
                Write-Host ("{0} {1} OK" -f $successMark, $user.Label)
            }
            else {
                $hasFailure = $true
                Write-Host ("{0} {1} FAILED" -f $failureMark, $user.Label) -ForegroundColor Red
                Write-Host ("HTTP Status: {0} ({1})" -f [int]$response.StatusCode, $response.ReasonPhrase)
                Write-Host ("Error: {0}" -f $responseBody)
            }
        }
        catch {
            $hasFailure = $true
            Write-Host ("{0} {1} FAILED" -f $failureMark, $user.Label) -ForegroundColor Red
            Write-Host "HTTP Status: unavailable"
            Write-Host ("Error: {0}" -f $_.Exception.Message)
        }
    }
}
finally {
    $client.Dispose()
}

if ($hasFailure) {
    exit 1
}

exit 0
