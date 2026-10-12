import { JobError } from '../../shared/types'

export interface ErrorMapping {
  matchCodes: number[]
  matchText: string[]
  message: string
  suggestedFix: string
}

// Windows HRESULT and Winget error codes:
// Winget errors start with 0x8A15xxxx:
// 0x8A15002B = -1978335189 (WINGET_INSTALLED_STATUS_ALREADY_INSTALLED)
// 0x8A15002C = -1978335188 (WINGET_INSTALLED_STATUS_NOT_APPLICABLE / NO_APPLICABLE_UPDATE)
// 0x8A150005 = -1978335227 (WINGET_INSTALLED_STATUS_PACKAGE_NOT_FOUND)
// 0x8A150006 = -1978335226 (WINGET_INSTALLED_STATUS_HASH_MISMATCH)
// 0x8A150023 = -1978335197 (WINGET_INSTALLED_STATUS_ADMIN_REQUIRED)
// 0x8A150019 = -1978335207 (WINGET_INSTALLED_STATUS_NETWORK_ERROR)
// 0x8A15000F = -1978335217 (WINGET_INSTALLED_STATUS_SOURCE_UNAVAILABLE)
// 0x8A15000B = -1978335221 (WINGET_INSTALLED_STATUS_INSTALLER_FAILED)
// 0x8A15001C = -1978335204 (WINGET_INSTALLED_STATUS_CANCELLED)
// 0x8A15002D = -1978335187 (WINGET_INSTALLED_STATUS_INSTALL_NOT_APPLICABLE)
// 3010 / 0x80070bc2 = ERROR_SUCCESS_REBOOT_REQUIRED
// 1603 = MSI ERROR_INSTALL_FAILURE
// 740 / 0x800702e4 = ERROR_ELEVATION_REQUIRED

const ERROR_MAPPINGS: ErrorMapping[] = [
  {
    matchCodes: [-1978335189, 0x8a15002b],
    matchText: ['already installed', 'another version is installed'],
    message: 'Already installed',
    suggestedFix: 'This application is already present on your PC. You can launch it directly from the Start Menu.',
  },
  {
    matchCodes: [-1978335188, 0x8a15002c],
    matchText: ['no applicable update', 'no update available', 'no updates found'],
    message: 'Already up to date',
    suggestedFix: 'You already have the newest version of this application installed.',
  },
  {
    matchCodes: [-1978335227, 0x8a150005],
    matchText: ['no package found', 'package not found', 'could not find a package'],
    message: 'Package not found',
    suggestedFix: 'The package identifier was not found in the Windows Package Manager repository. Please retry later.',
  },
  {
    matchCodes: [-1978335226, 0x8a150006],
    matchText: ['hash does not match', 'hash mismatch', 'sha256 mismatch', 'checksum'],
    message: 'Integrity hash mismatch',
    suggestedFix: 'The downloaded installer does not match the publisher checksum. The repository maintainers will update this shortly.',
  },
  {
    matchCodes: [-1978335197, 0x8a150023, 740, 0x800702e4],
    matchText: ['administrator rights', 'requires administrator', 'elevation required', 'run as admin'],
    message: 'Administrator rights required',
    suggestedFix: 'This installer must modify system directories. Please relaunch OptiCore as administrator to proceed.',
  },
  {
    matchCodes: [-1978335207, 0x8a150019, 0x80072ee7],
    matchText: ['internet', 'connection failed', 'failed to connect', 'download error', 'network error'],
    message: 'No internet connection',
    suggestedFix: 'Unable to connect to download servers. Please check your internet connection and try again.',
  },
  {
    matchCodes: [-1978335217, 0x8a15000f],
    matchText: ['source unavailable', 'failed to update source', 'unable to open source'],
    message: 'Package source unavailable',
    suggestedFix: 'The winget repository source is temporarily unreachable. Please retry in a few moments.',
  },
  {
    matchCodes: [-1978335204, 0x8a15001c],
    matchText: ['cancelled by user', 'operation cancelled', 'user cancelled'],
    message: 'Cancelled by user',
    suggestedFix: 'The installation was stopped before completing.',
  },
  {
    matchCodes: [3010, 0x80070bc2],
    matchText: ['reboot required', 'restart required', 'restart computer'],
    message: 'Restart required',
    suggestedFix: 'Installation succeeded, but Windows requires a system restart before using this software.',
  },
  {
    matchCodes: [-1978335221, 0x8a15000b, 1603],
    matchText: ['installer failed', 'exit code: 1603', 'fatal error during installation'],
    message: 'Installer failed',
    suggestedFix: 'The native installer returned an error. Close any running instances of the app and try again.',
  },
]

export function mapWingetExitCode(
  exitCode: number,
  stdout: string = '',
  stderr: string = ''
): JobError {
  const combined = `${stdout}\n${stderr}`.toLowerCase()

  // 1. Check exact exit code match
  for (const mapping of ERROR_MAPPINGS) {
    if (mapping.matchCodes.includes(exitCode)) {
      return {
        message: mapping.message,
        code: exitCode,
        suggestedFix: mapping.suggestedFix,
        rawDetails: `Exit code: 0x${(exitCode >>> 0).toString(16).toUpperCase()} (${exitCode})\n${stdout.slice(-500)}`,
      }
    }
  }

  // 2. Check text substring match in combined output
  for (const mapping of ERROR_MAPPINGS) {
    for (const phrase of mapping.matchText) {
      if (combined.includes(phrase.toLowerCase())) {
        return {
          message: mapping.message,
          code: exitCode,
          suggestedFix: mapping.suggestedFix,
          rawDetails: `Exit code: 0x${(exitCode >>> 0).toString(16).toUpperCase()} (${exitCode})\n${stdout.slice(-500)}`,
        }
      }
    }
  }

  // 3. Fallback for unknown error code
  const hexCode = `0x${(exitCode >>> 0).toString(16).toUpperCase()}`
  return {
    message: `Installation failed (${hexCode})`,
    code: exitCode,
    suggestedFix: 'An unexpected installer error occurred. Use "Copy details" to inspect the raw diagnostic log.',
    rawDetails: `Exit code: ${hexCode} (${exitCode})\n${stderr || stdout.slice(-800)}`,
  }
}
