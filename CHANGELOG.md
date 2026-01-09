# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Frontend: Tailwind CSS Configuration** (#91)
  - Configured dark mode with class-based strategy for seamless theme switching
  - Added Sentinel brand color palette (sentinel-50 to sentinel-950) with HSL color system
  - Implemented semantic color tokens (primary, secondary, muted, accent, destructive) for consistent theming
  - Setup CSS variables for theme customization with automatic dark mode support
  - Configured tailwindcss-animate plugin for smooth component animations
  - Added border radius tokens (lg, md, sm) for consistent UI styling
  - Setup font family variables (Inter sans-serif, monospace) for typography
  - Configured animation keyframes for accordion and interactive components
  - Added comprehensive Jest test suite for Tailwind configuration validation

### Security

- **Dependency Security Updates** (#97)
  - Fixed HIGH severity vulnerability in qs (CVE-2025-15284) - upgraded to >=6.14.1
  - Fixed HIGH severity vulnerability in glob (CVE-2025-64756) - upgraded to >=10.5.0
  - Fixed MODERATE severity vulnerability in js-yaml (CVE-2025-64718) - upgraded to >=4.1.1
  - Fixed LOW severity vulnerability in tmp (CVE-2025-54798) - upgraded to >=0.2.4
  - Implemented pnpm overrides to ensure consistent secure versions across monorepo

## [0.1.0] - 2026-01-09

### Added

- **Project Infrastructure** (#2)
  - Monorepo setup with Turborepo for efficient build orchestration
  - Configured pnpm workspaces for package management
  - Established workspace structure (apps/api, apps/web)

- **Backend: NestJS Scaffolding** (#14, PR #89)
  - NestJS backend application with modular architecture
  - RESTful API foundation with Swagger documentation
  - Global exception filters and validation pipes
  - Health check endpoints for monitoring
  - Security middleware (Helmet, CORS)
  - Request logging with Pino logger
  - Rate limiting with @nestjs/throttler
  - Environment configuration with validation

- **Frontend: Next.js Base** (#90, PR #96)
  - Next.js 14 App Router setup with TypeScript
  - React 19 integration with latest features
  - ESLint configuration with Next.js best practices
  - PostCSS and Autoprefixer for CSS processing
  - Responsive layout with proper metadata

### Changed

- Initial release baseline established

[Unreleased]: https://github.com/tjsasakifln/sentinel-rfp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/tjsasakifln/sentinel-rfp/releases/tag/v0.1.0
