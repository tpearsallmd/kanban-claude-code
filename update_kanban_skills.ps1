# Install/update kanban SDLC skills.
#
# If run from inside the repo (clone or submodule), uses the local copy.
# Otherwise, pulls the latest fresh from GitHub -- no repo clone needed.
#
# Usage:
#   .\update_kanban_skills.ps1         # interactive -- prompts for agent type and install level
#   .\update_kanban_skills.ps1 -Help   # show usage

param(
    [switch]$Help
)

$ErrorActionPreference = "Stop"

$RepoUrl = "https://github.com/tpearsallmd/kanban-claude-code.git"
$Skills = @("kanban", "build", "review", "test", "pipeline", "commit")

if ($Help) {
    Write-Host "Usage: .\update.ps1"
    Write-Host ""
    Write-Host "Interactive installer for kanban SDLC skills."
    Write-Host "Prompts for agent type (claude/codex) and install level (user/project)."
    exit 0
}

# --- Prompt: agent type ---
$Agent = Read-Host "Which agent? [claude/codex] (default: claude)"
if (-not $Agent) { $Agent = "claude" }

if ($Agent -ne "claude" -and $Agent -ne "codex") {
    Write-Error "Unknown agent type '$Agent'. Use 'claude' or 'codex'."
    exit 1
}

# --- Prompt: install level ---
# Detect project root from CWD
$ProjectRoot = $null
$Dir = (Get-Location).Path
while ($Dir) {
    if (Test-Path "$Dir\.git") {
        $ProjectRoot = $Dir
        break
    }
    $Parent = Split-Path -Parent $Dir
    if ($Parent -eq $Dir) { break }
    $Dir = $Parent
}

$UserTarget = Join-Path $HOME ".$Agent\skills"

if ($ProjectRoot) {
    $ProjectTarget = Join-Path $ProjectRoot ".$Agent\skills"
    Write-Host ""
    Write-Host "Install level:"
    Write-Host "  1) Project -- $ProjectTarget"
    Write-Host "  2) User    -- $UserTarget"
    Write-Host ""
    $Level = Read-Host "Choose [1/2] (default: 1)"
    if (-not $Level) { $Level = "1" }

    switch ($Level) {
        "1" { $Target = $ProjectTarget }
        "2" { $Target = $UserTarget }
        default { Write-Error "Invalid choice '$Level'."; exit 1 }
    }
} else {
    Write-Host ""
    Write-Host "No project detected. Installing to user level: $UserTarget"
    $Target = $UserTarget
}

# --- Determine source directory ---
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TempClone = $null

if (Test-Path "$ScriptDir\$Agent") {
    $Source = $ScriptDir
    Write-Host "`nUsing local repo at $Source"
} else {
    $TempClone = Join-Path ([System.IO.Path]::GetTempPath()) "kanban-skills-$(Get-Random)"
    Write-Host "`nCloning from $RepoUrl..."
    git clone --depth 1 --quiet $RepoUrl $TempClone
    $Source = $TempClone
}

try {
    if (-not (Test-Path "$Source\$Agent")) {
        Write-Error "Agent type '$Agent' not found in repo (no $Agent\ directory)."
        exit 1
    }

    Write-Host "Installing $Agent skills -> $Target"

    # --- Preserve user's SDLC.md configuration if it exists ---
    $SdlcBackup = $null
    $SdlcPath = Join-Path $Target "kanban\SDLC.md"
    if (Test-Path $SdlcPath) {
        $SdlcBackup = [System.IO.Path]::GetTempFileName()
        Copy-Item $SdlcPath $SdlcBackup
        Write-Host "Backed up existing SDLC.md (will preserve your configuration)"
    }

    # --- Copy each skill ---
    foreach ($Skill in $Skills) {
        $SkillTarget = Join-Path $Target $Skill
        if (-not (Test-Path $SkillTarget)) {
            New-Item -ItemType Directory -Path $SkillTarget -Force | Out-Null
        }
        Copy-Item "$Source\$Agent\$Skill\*" $SkillTarget -Force
        Write-Host "  Updated $Skill"
    }

    # --- Restore user's SDLC.md configuration if it had real values ---
    if ($SdlcBackup) {
        $BackupContent = Get-Content $SdlcBackup -Raw
        if ($BackupContent -notmatch 'YOUR_CLOUD_ID') {
            Copy-Item $SdlcBackup $SdlcPath -Force
            Write-Host "  Restored your SDLC.md configuration (Cloud ID, project key, transition IDs)"
        } else {
            Write-Host "  SDLC.md has default placeholders -- using fresh copy"
        }
        Remove-Item $SdlcBackup -Force
    }

    Write-Host ""
    Write-Host "Done. Skills installed to $Target."

    $CurrentSdlc = Get-Content $SdlcPath -Raw -ErrorAction SilentlyContinue
    if ($CurrentSdlc -match 'YOUR_CLOUD_ID') {
        Write-Host ""
        Write-Host "IMPORTANT: Edit $SdlcPath to set your Cloud ID, project key, and transition IDs."
    }
} finally {
    if ($TempClone -and (Test-Path $TempClone)) {
        Remove-Item $TempClone -Recurse -Force
    }
}
