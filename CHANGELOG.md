# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.7.1] - 2026-02-10
### Fixed
- Queue processor now uses Page Store (getPage) instead of direct fetch, fixing single source of truth violation
- Batch route now extracts all meta tag fields (was missing author, themeColor, favicon, hreflang, security, siteVerification, etc.)
- Batch route now runs comprehensive 20+ rule analysis instead of simplified 8-check version
- Batch and queue routes now pass imageValidation to scoring so broken images are not scored as "present"

### Changed
- Extract shared API library for meta tag analyser (types.ts, parse-html.ts, analyze.ts) eliminating ~2000 lines of duplicated code across 4 routes

## [1.7.0] - 2026-01-25
### Added
- PPC Page Analyser tool for analysing landing pages
- Conversion element detection (CTAs, forms, phone numbers, chat widgets)
- Landing page scoring system
- Batch processing support for PPC Page Analyser

## [1.6.24] - 2025-01-24
### Changed
- Update criticality levels and enhance hreflang handling in Meta Tag Analyser

## [1.6.0] - 2025-01-24
### Added
- URL Batch Processing system with shared UrlBatchPanel component
- Page Archive importer integration
- Enhanced sitemap parsing and URL analysis

### Fixed
- React hooks dependency warnings
- ESLint configuration and lint warnings
- Permission imports for bulk delete operations

## [1.5.0] - 2025-01-23
### Added
- Page Archive tool for admin users
- Bulk delete with warning modals
- Page Store settings in client edit UI

### Fixed
- Sidebar layout wrapper for Page Archive
- Tools filtering by requiredRole
- Page Store timeout and error handling

## [1.4.0] - 2025-01-22
### Added
- Page Store architecture (single source of truth for page content)
- PageStoreService for page source management
- Vercel Blob storage for HTML content
- URL normalisation utilities
- PageSnapshot and PageStore database models

### Fixed
- Database validation constraints and TypeScript types

## [1.3.0] - 2025-01-21
### Added
- RBAC (Role-Based Access Control) system
- Profile model for permission management
- User permissions management page
- Client assignment model
- Permission checks on API endpoints and UI

## [1.2.0] - 2025-01-20
### Added
- Enhanced metadata comparison with diff highlighting
- Image URL validation with GET fallback
- Extended metadata fields and scoring

### Changed
- Streamlined error handling in Meta Tag Analyser
- Renamed error fields to validationErrors for consistency

## [1.1.0] - 2025-01-19
### Added
- Feedback functionality
- Global client selection with persistence
- Queue management and progress tracking for scans
- HTML entity decoding and animations
- Tool usage data in client details

### Fixed
- Client selection updates on navigation

## [1.0.0] - 2025-01-18
### Added
- Initial release of TDS App Portal
- Meta Tag Analyser tool with scan history
- Client management system
- User authentication (Google OAuth)
- Admin user management
