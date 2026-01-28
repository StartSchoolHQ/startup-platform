# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

**Please DO NOT create a public GitHub issue for security vulnerabilities.**

Instead, please report them via one of the following methods:

1. **Email:** Send details to [security contact email - start@startschool.org]
2. **Private disclosure:** Use GitHub's private vulnerability reporting feature

### What to Include

When reporting a vulnerability, please include:

- **Description** of the vulnerability
- **Steps to reproduce** the issue
- **Potential impact** of the vulnerability
- **Suggested fix** (if you have one)

### What to Expect

- **Acknowledgment:** We'll acknowledge receipt within 48 hours
- **Assessment:** We'll assess the vulnerability and determine severity
- **Updates:** We'll keep you informed of our progress
- **Resolution:** We aim to resolve critical issues within 7 days
- **Credit:** We'll credit you in the fix (unless you prefer anonymity)

### Scope

The following are in scope:

- Authentication and authorization issues
- Data exposure vulnerabilities
- SQL injection or other injection attacks
- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- Insecure direct object references
- Security misconfigurations

Out of scope:

- Social engineering attacks
- Physical security issues
- Issues in third-party dependencies (report to them directly)
- Issues requiring physical access to user's device

## Security Best Practices for Contributors

When contributing code, please ensure:

1. **Never commit secrets** - Use environment variables
2. **Validate all inputs** - Both client and server-side
3. **Use Supabase RLS** - Row Level Security for all database tables
4. **Sanitize outputs** - Prevent XSS attacks
5. **Check permissions** - Verify user authorization for all actions
6. **Keep dependencies updated** - Regularly update npm packages

## Known Security Measures

This project implements:

- ✅ Supabase Row Level Security (RLS)
- ✅ Server-side authentication validation
- ✅ Environment variable configuration for secrets
- ✅ Input validation with Zod schemas
- ✅ CSRF protection via Supabase Auth
- ✅ Content Security Policy headers (via Next.js)

## Acknowledgments

We thank the following security researchers for responsibly disclosing vulnerabilities:

_No vulnerabilities reported yet - be the first!_
