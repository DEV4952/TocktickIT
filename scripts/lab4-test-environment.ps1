param([ValidateSet('Start','Stop','Server')][string]$Action='Start', [string]$PostgresBin='C:\Program Files\PostgreSQL\18\bin')
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root
$data=Join-Path $root 'artifacts\lab-04\e2e-results\disposable-postgres'
$url='postgresql://lab4qa@127.0.0.1:55439/lab4_qa_test'
if($Action -eq 'Stop') {
 if(!(Test-Path (Join-Path $data 'PG_VERSION'))) { throw 'Expected disposable cluster not found' }
 & (Join-Path $PostgresBin 'pg_ctl.exe') -D $data -m fast -w stop
 exit $LASTEXITCODE
}
if(!(Test-Path $data)) {
 & (Join-Path $PostgresBin 'initdb.exe') -D $data -U lab4qa -A trust --encoding=UTF8 --locale=C
 if($LASTEXITCODE -ne 0){throw 'Temporary initdb failed'}
}
& (Join-Path $PostgresBin 'pg_ctl.exe') -D $data status *> $null
if($LASTEXITCODE -ne 0) {
 & (Join-Path $PostgresBin 'pg_ctl.exe') -D $data -l (Join-Path $root 'artifacts\lab-04\e2e-results\disposable-postgres.log') -o '-p 55439 -h 127.0.0.1' -w start
 if($LASTEXITCODE -ne 0){throw 'Temporary cluster start failed; do not reuse another running server'}
}
# Verify the connected server belongs to this exact workspace cluster.
$actualData = & (Join-Path $PostgresBin 'psql.exe') -h 127.0.0.1 -p 55439 -U lab4qa -d postgres -Atc 'SHOW data_directory'
if($LASTEXITCODE -ne 0 -or [IO.Path]::GetFullPath($actualData.Trim()) -ne [IO.Path]::GetFullPath($data)){throw 'Unexpected PostgreSQL server; refusing changes'}
$exists = & (Join-Path $PostgresBin 'psql.exe') -h 127.0.0.1 -p 55439 -U lab4qa -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname='lab4_qa_test'"
if($exists -ne '1') {
 & (Join-Path $PostgresBin 'createdb.exe') -h 127.0.0.1 -p 55439 -U lab4qa lab4_qa_test
 if($LASTEXITCODE -ne 0){throw 'Disposable createdb failed'}
}
& (Join-Path $PostgresBin 'psql.exe') $url -v ON_ERROR_STOP=1 -c "COMMENT ON DATABASE lab4_qa_test IS 'TocktickIT disposable regression lab4.10'"
if($LASTEXITCODE -ne 0){throw 'Disposable marker setup failed'}
$env:DATABASE_URL=$url
$env:E2E_DATABASE_URL=$url
$env:LAB4_DISPOSABLE_REGRESSION='1'
$env:E2E_ALLOW_SHARED_DEV_DB=$null
npx.cmd --prefix server prisma migrate deploy --schema server/prisma/schema.prisma
if($LASTEXITCODE -ne 0){throw 'Disposable migrations failed'}
npm.cmd --prefix server run prisma:seed
if($LASTEXITCODE -ne 0){throw 'Disposable seed failed'}
Write-Output 'Verified disposable target: 127.0.0.1:55439/lab4_qa_test (development is untouched)'
if($Action -eq 'Server') {
 npm.cmd --prefix server run test -- --fileParallelism=false
 if($LASTEXITCODE -ne 0){throw 'Regression failed; inspect test output'}
}
