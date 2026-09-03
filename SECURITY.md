# Security Policy

## Overview

Security is important for NAHVI because the application can interact with AI services, local files, applications, and Windows desktop functionality.

This policy explains how to report security issues responsibly.

## Supported Versions

The latest version available on the `main` branch is the primary version considered for security review.

Older versions may not receive security fixes.

## Reporting a Security Issue

If you discover a security vulnerability in NAHVI, please do not publicly disclose the details through a GitHub issue.

Instead, contact the project owner privately with:

- A clear description of the vulnerability
- Steps required to reproduce it
- The affected component or file
- Potential security impact
- Any suggested mitigation, if available

## Sensitive Information

Never include the following in a public issue, pull request, or repository commit:

- API keys
- Access tokens
- Passwords
- Environment files
- Private credentials
- Browser session data
- Cookies
- Personal user data
- Local runtime memory
- Private documents

If a credential is accidentally committed or exposed, it should be revoked or rotated immediately.

## Local Data

NAHVI may generate local runtime data during operation.

Private runtime information, personal data, credentials, logs, and environment-specific files should remain outside the public repository.

The repository's `.gitignore` is configured to exclude several categories of local and sensitive data.

## Desktop Automation

NAHVI contains functionality capable of interacting with the Windows desktop.

Users should only run NAHVI on systems they own or are authorized to control.

Before enabling automation workflows, users should understand what actions the assistant is capable of performing.

## Third-Party Services

NAHVI may use third-party AI providers and other external services.

Users are responsible for following the security requirements, terms, and privacy policies of those services when configuring their own API credentials.

## Security Best Practices for Contributors

Contributors should:

1. Never commit secrets or credentials.
2. Use environment variables for API keys.
3. Avoid committing personal or private data.
4. Review staged files before pushing changes.
5. Keep dependencies reasonably up to date.
6. Avoid storing authentication tokens in source code.
7. Test desktop automation carefully before deploying changes.

## Scope

This policy covers security issues in the NAHVI source code and project configuration maintained in this repository.

Issues caused entirely by third-party services or the user's local environment may fall outside the project's direct control.

## Responsible Disclosure

Please allow reasonable time for a security issue to be investigated and addressed before publicly disclosing technical details.

Thank you for helping keep NAHVI and its users safer.
