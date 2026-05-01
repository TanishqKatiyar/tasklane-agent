# Security Policy

At Tasklane, security is treated as a foundational feature, not an afterthought. We actively monitor for vulnerabilities and implement strict, enterprise-grade safeguards.

## Supported Versions

We only provide security updates for the current active release stream.

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability within Tasklane, please email the security team directly at **security@tasklane.dev**.

We treat all reports with the highest priority and commit to the following SLAs:

- **Initial Response**: Within 24 hours.
- **Triage & Assessment**: Within 48 hours.
- **Patch Development & Deployment**: Expedited based on severity (Critical patches are deployed out-of-band within 24 hours).

## Best Practices Enforced

- **Stateless Authentication**: We use strict JWTs with sliding sessions.
- **Input Validation**: All payloads are sterilized and validated via Zod schemas at the application boundary.
- **Database Access**: All database transactions occur over secure SSL connections using parameterized queries to prevent SQL injection.
- **Dependencies**: Automated dependency scanning via Dependabot and Snyk.

Thank you for helping us keep Tasklane secure.
