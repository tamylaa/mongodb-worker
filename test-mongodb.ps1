$ErrorActionPreference = "Stop"

#$uri = "https://ap-south-1.data.mongodb-api.com/app/auth-service-ggyafjt/endpoint/data/v1/action/findOne"
#$uri = "https://data.mongodb-api.com/app/auth-service-ggyafjt/endpoint/data/v1";
#$uri = "https://eu-central-1.aws.data.mongodb-api.com/app/auth-service-ggyafjt/endpoint/data/v1/action/findOne"
#$uri = "https://ap-south-1.aws.data.mongodb-api.com/app/auth-service-ggyafjt/endpoint/data/v1/action/findOne"

$uri = "https://services.cloud.mongodb.com/api/app/auth-service-ggyafjt/endpoint/data/v1/action/findOne"

$headers = @{
    "api-key" = "8d300867-07fb-427a-8f92-bb0aebcc18cf"
    "Content-Type" = "application/json"
}

$body = @{
    dataSource = "tamylaauth"
    database = "tamyla-auth"
    collection = "users"
    filter = @{}
} | ConvertTo-Json

try {
    Write-Host "Sending request to: $uri"
    Write-Host "Headers: " ($headers | ConvertTo-Json)
    Write-Host "Body: $body"
    
    $response = Invoke-WebRequest -Uri $uri -Method Post -Headers $headers -Body $body -UseBasicParsing
    
    Write-Host "`nSuccess! Status Code:" $response.StatusCode
    Write-Host "Response:"
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
    
} catch {
    Write-Host "`nError Details:"
    Write-Host "Exception Type:" $_.Exception.GetType().FullName
    Write-Host "Message:" $_.Exception.Message
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        
        Write-Host "Status Code:" $_.Exception.Response.StatusCode.value__
        Write-Host "Status Description:" $_.Exception.Response.StatusDescription
        Write-Host "Response Headers:" ($_.Exception.Response.Headers | Out-String)
        Write-Host "Response Body: $responseBody"
    } else {
        Write-Host "No response received. Possible connection issue."
    }
}