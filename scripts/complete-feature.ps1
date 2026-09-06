param([Parameter(Mandatory=$true)][string]$Branch)
$ErrorActionPreference = 'Stop'
function Git-Run { & git @args; if ($LASTEXITCODE -ne 0) { throw "git $args failed" } }
function Verify-Build { & pnpm test; if ($LASTEXITCODE -ne 0) { throw 'Tests failed' }; & pnpm build; if ($LASTEXITCODE -ne 0) { throw 'Build failed' } }
if ((git branch --show-current) -ne $Branch) { throw 'Checkout the completed feature first' }
if (git status --porcelain) { throw 'Commit changes before merging' }
Git-Run fetch origin
Git-Run switch dev
Git-Run merge --ff-only origin/dev
Git-Run merge --no-ff $Branch -m "chore: merge $Branch into dev"
Verify-Build
$verifiedTree = git rev-parse 'HEAD^{tree}'
Git-Run switch $Branch
Git-Run merge --no-ff origin/main -m "chore: sync main into $Branch"
if ((git rev-parse 'HEAD^{tree}') -ne $verifiedTree) { Verify-Build }
Git-Run switch main
Git-Run merge --ff-only origin/main
Git-Run merge --no-ff $Branch -m "chore: merge $Branch into main"
$mainTree = git rev-parse 'HEAD^{tree}'
Git-Run switch dev
Git-Run merge --no-ff $Branch -m "chore: sync $Branch into dev"
if ((git rev-parse 'HEAD^{tree}') -ne $mainTree) { throw 'main/dev contents differ; reconcile before continuing' }
Git-Run push origin main dev $Branch
Git-Run switch main
Write-Output "Verified and published $Branch (tree $mainTree)"
