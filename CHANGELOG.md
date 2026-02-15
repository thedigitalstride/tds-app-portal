# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.11.0] - 2026-02-15
### Changed
- Updated styling and typography in PRD components

## [1.10.0] - 2026-02-14
### Added
- AI Cost Tracking dashboard for admin users (`/admin/ai-costs`)
- Automatic AI usage logging built into Claude and OpenAI clients
- Cost attribution by tool, user, client, and AI model
- Static per-model pricing map with USD cost storage
- Live USD→GBP exchange rate conversion (exchangerate-api.com, 1hr cache)
- Summary cards (all-time, month, week, today), breakdown tables, daily trend chart, and filterable logs view
- AiUsageLog database model with time-series indexes

## [1.9.0] - 2026-02-11
### Added
- Ideation tool: 5-stage AI-guided wizard transforming ideas into structured PRDs
- AI co-creator with proactive suggestions, multiple choice options, and adaptive conversation
- Idea scoring with viability, uniqueness, and effort dimensions plus go/no-go recommendation
- Team collaboration: comments, upvote/downvote voting, and collaborator access
- Idea templates (New Tool, Process Improvement, Client Deliverable, Integration)
- AI inspiration mode generating idea seeds from industry trends and agency pain points
- Pipeline view with status filtering, vote counts, and score badges
- PRD export as downloadable markdown
- Multi-turn Claude conversation support (`sendClaudeConversation()`)
- First tool without client scoping (`hasClientData: false`)

## [1.8.0] - 2026-02-10
### Added
- Quick rescan option that skips screenshots for faster, cheaper rescans
- Image preview thumbnails with click-to-enlarge Dialog modal and broken image detection
- Unified field status module (`field-status.ts`) as single source of truth for field validity across scoring and UI
- Per-field status badges in Open Graph and Twitter Card sections (replacing section-level badges)
- HTML-only fetch mode in ScrapingBee service (`fetchHtmlOnly`) saving ~15-55 credits per rescan

### Fixed
- Saved route now passes imageValidation to scoring so broken images are not counted as present
- Auth import in ScrapingBee usage layout to use shared `getServerSession`
- Cookie domain config saves now validate responses and propagate errors

### Changed
- MetadataViewer layout: Technical, Structured Data, and Image Validation sections moved to left column
- Scoring module refactored to delegate field presence checks to unified field-status utility

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
