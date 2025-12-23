# Testing and Documentation Plan - Google OAuth Integration Branch

## Branch Summary
**Branch:** `feat/google-oauth-integration`
**Files Changed:** 38 files (+3,687 lines, -2,261 lines)

### Major Changes in Branch:
1. **Google OAuth Integration** - Calendar + Gmail OAuth for instructors
2. **Functional Refactoring** - Converted 7 classes to functional modules
3. **Centralized Configuration** - Created `config/index.js` for env vars
4. **Email Provider Architecture** - Modular provider selection (Gmail OAuth, Nodemailer)
5. **Email Template System** - Extracted to `utils/emailTemplates.js`
6. **Frontend OAuth Composable** - Reusable `useOAuth.js` for OAuth flows
7. **Constants Extraction** - Created `emailConstants.js`, `oauthConstants.js`

---

## PHASE 1: Documentation Cleanup & Consolidation

**Priority:** HIGH - Do this FIRST before testing
**Rationale:** Tests should reference accurate documentation; docs inform what to test

### 1.1 Create Master OAuth Integration Doc

**Action:** Consolidate OAuth knowledge into single source of truth

**New File:** `docs/GOOGLE_OAUTH_INTEGRATION.md`

**Should Include:**
- Overview of dual OAuth functionality (Calendar + Gmail)
- Architecture diagram (provider selection, token storage, auth flow)
- Setup instructions for admins (how to get credentials)
- Instructor usage guide (how to connect accounts)
- Troubleshooting section
- API endpoints reference
- Frontend composable usage

**Sources to Consolidate:**
- `docs/GET_GOOGLE_OAUTH_CREDENTIALS.md` (keep as-is, reference from main doc)
- `docs/SYSTEM_EMAIL_OAUTH_FEATURE.md` (merge relevant sections, mark as FUTURE WORK)
- Inline comments from `config/googleOAuth.js`
- Frontend composable docs from `frontend/src/composables/useOAuth.js`

**Disposition:**
- **KEEP:** `GET_GOOGLE_OAUTH_CREDENTIALS.md` (move to `docs/setup/`)
- **ARCHIVE:** `SYSTEM_EMAIL_OAUTH_FEATURE.md` → `plans/` (not implemented)
- **CREATE:** `GOOGLE_OAUTH_INTEGRATION.md` (comprehensive guide)

### 1.2 Update Email System Documentation

**Action:** Document new email provider architecture

**New File:** `docs/EMAIL_SYSTEM.md`

**Should Include:**
- Email provider architecture (Gmail OAuth, Nodemailer)
- Provider selection logic and priority
- Configuration requirements
- Template system overview (refer to separate doc)
- Email queue service
- Troubleshooting

**Sources:**
- `services/email/emailConfig.js` provider rules
- `services/EmailService.js` architecture
- `services/email/gmailProvider.js` implementation notes
- `services/email/nodemailerProvider.js` implementation notes

### 1.3 Update Email Templates Documentation

**Action:** Document centralized template system

**New File:** `docs/EMAIL_TEMPLATES.md`

**Should Include:**
- Template architecture (base, contents, partials)
- Available variables per template type
- Constants reference (`emailConstants.js`)
- Adding new templates
- Template data structure patterns
- Handlebars helpers reference

**Sources:**
- `utils/emailTemplates.js` comprehensive JSDoc
- `utils/emailConstants.js` constants
- `email-templates/` directory structure

### 1.4 Update CLAUDE.md

**Action:** Update AI assistant guidance with new architecture

**Changes to `CLAUDE.md`:**
- Update Services section with new email provider architecture
- Add OAuth integration patterns
- Document centralized config usage (`config/index.js`)
- Note functional programming preference
- Update Common Commands if needed

### 1.5 Update Testing Guide

**Action:** Expand `docs/TESTING_GUIDE.md` with OAuth testing patterns

**Add Sections:**
- Mocking OAuth flows
- Testing email providers
- Testing functional modules
- Integration test patterns for OAuth

---

## PHASE 2: Fix Existing Broken Tests

**Priority:** HIGH - Do BEFORE adding new tests
**Rationale:** Establish green baseline before adding coverage

### 2.1 Identify All Test Issues

**Action:** Run full test suite and document failures

```bash
npm test 2>&1 | tee test-output.txt
```

**Known Issues:**
- `tests/middleware.test.js` - Database error (line 262)
- `tests/public-api.test.js` - Database connection failed (line 101)
- `frontend/src/tests/attendance.test.js` - 2 tests skipped
- Backend unit tests - Some failures (ignored per user)

**Create:** `TEST_ISSUES.md` listing:
- Test file
- Test name
- Error message
- Root cause analysis
- Fix strategy

### 2.2 Fix Backend Test Failures

**Priority Order:**
1. Fix `middleware.test.js` database mock issue
2. Fix `public-api.test.js` AppSettings mock
3. Review other backend failures (may ignore per user preference)

**Strategy:**
- Update mocks to match new functional module signatures
- Ensure config module is properly mocked
- Fix any broken provider selection logic

### 2.3 Fix/Review Frontend Skipped Tests

**Files to Review:**
- `frontend/src/tests/attendance.test.js` (2 skipped tests)

**Strategy:**
- Determine if tests still relevant post-refactoring
- Either fix or remove if obsolete
- Document decision

---

## PHASE 3: Add New Test Coverage

**Priority:** MEDIUM - After broken tests fixed
**Rationale:** Ensure new features are tested before merge

### 3.1 OAuth Integration Tests

**New File:** `tests/google-oauth-integration.test.js`

**Test Coverage:**
- OAuth URL generation
- Token storage and retrieval
- Token refresh logic
- Instructor token association
- Scope validation (calendar + gmail)
- Error handling (invalid tokens, expired tokens)

**Key Functions to Test:**
- `config/googleOAuth.js` - all exported functions
- `models/InstructorGoogleToken.js` - CRUD operations

### 3.2 Email Provider Tests

**New File:** `tests/email-providers.test.js`

**Test Coverage:**
- Provider selection logic
- Gmail OAuth provider initialization
- Nodemailer provider initialization
- Provider fallback scenarios
- Email sending through each provider
- Configuration status checks

**Key Functions to Test:**
- `services/email/emailConfig.js` - selectProvider()
- `services/email/gmailProvider.js` - send(), isAvailable()
- `services/email/nodemailerProvider.js` - send(), getConfigurationStatus()

### 3.3 Email Template Tests

**New File:** `tests/email-templates.test.js`

**Test Coverage:**
- Template compilation
- Variable substitution
- Handlebars helpers
- Business context building
- Constants usage
- All email types generate correctly

**Key Functions to Test:**
- `utils/emailTemplates.js` - all exported functions
- `utils/emailConstants.js` - constant exports

### 3.4 Functional Module Tests

**New File:** `tests/functional-modules.test.js`

**Test Coverage:**
- GoogleCalendarService factory function
- BusinessTimezoneService functions
- Logger functions with state
- RefundService stateless functions
- CronJobService lifecycle
- EmailQueueService state management

**Key Modules to Test:**
- `services/GoogleCalendarService.js`
- `utils/businessTimezone.js`
- `utils/logger.js`
- `services/RefundService.js`
- `services/CronJobService.js`
- `services/EmailQueueService.js`

### 3.5 Configuration Module Tests

**New File:** `tests/config-module.test.js`

**Test Coverage:**
- Environment variable parsing
- Type coercion (toBoolean, toNumber)
- Default value handling
- Configuration object structure
- All config sections present

**Key Module to Test:**
- `config/index.js`

### 3.6 Frontend OAuth Tests

**New File:** `frontend/src/tests/oauth.test.js`

**Test Coverage:**
- useOAuth composable lifecycle
- OAuth popup flow
- Message passing between windows
- Error handling with constants
- Status checking
- Connect/disconnect flows

**Key Component to Test:**
- `frontend/src/composables/useOAuth.js`
- `frontend/src/views/GoogleAuthCallback.vue`
- `frontend/src/constants/oauthConstants.js`

### 3.7 Integration Tests

**New File:** `tests/integration/oauth-flow-integration.test.js`

**Test Coverage:**
- Full OAuth authorization flow
- Calendar access with OAuth
- Email sending with OAuth
- Provider switching based on configuration
- Error recovery and fallback

**End-to-End Scenarios:**
- Instructor connects OAuth → calendar events sync
- Admin configures Gmail OAuth → emails sent via Gmail
- OAuth fails → falls back to Nodemailer
- Token expires → auto-refreshes

---

## PHASE 4: Update Existing Tests

**Priority:** LOW - After new tests added
**Rationale:** Ensure existing tests account for new architecture

### 4.1 Update Tests Affected by Refactoring

**Files to Update:**
- `tests/refund.test.js` - Updated for functional RefundService
- `tests/permissions.test.js` - Already fixed (slot calculation)
- `tests/route-permissions.test.js` - Already fixed (slot calculation)
- Any test importing refactored modules

**Changes Needed:**
- Update imports to match new functional exports
- Update mocks for factory functions
- Verify no class instantiation assumptions

### 4.2 Add OAuth Scenarios to Existing Tests

**Files to Update:**
- `tests/booking-conflicts.test.js` - Add OAuth calendar events
- `tests/middleware.test.js` - Add OAuth token validation
- Any email-related tests - Add provider selection scenarios

---

## PHASE 5: Documentation Review & Polish

**Priority:** LOW - Final step before merge
**Rationale:** Ensure all docs are consistent and complete

### 5.1 Cross-Reference Review

**Action:** Ensure all docs reference each other correctly

**Check:**
- CLAUDE.md references new docs
- README.md links to new guides
- Each new doc has "Related Docs" section
- No dead links or outdated references

### 5.2 Code Example Validation

**Action:** Test all code examples in documentation

**Process:**
- Extract code snippets from docs
- Verify they run/compile
- Update if syntax changed

### 5.3 Changelog Update

**Action:** Create comprehensive CHANGELOG entry

**File:** `CHANGELOG.md` (or create if not exists)

**Entry Sections:**
- Added (OAuth integration, provider architecture)
- Changed (Functional refactoring, centralized config)
- Fixed (Test data, email template variables)
- Deprecated (Class-based services)

---

## Execution Order & Timeline

### Week 1: Documentation (Phase 1)
**Days 1-2:** Create master OAuth integration doc
**Days 3-4:** Create email system docs (provider + templates)
**Day 5:** Update CLAUDE.md and functional programming guide

**Deliverable:** Complete, accurate documentation set

### Week 2: Test Fixes & Core Coverage (Phases 2 & 3.1-3.3)
**Days 1-2:** Fix all broken tests, achieve green baseline
**Days 3-4:** Add OAuth integration tests
**Day 5:** Add email provider and template tests

**Deliverable:** OAuth and email features fully tested

### Week 3: Extended Coverage (Phases 3.4-3.7)
**Days 1-2:** Add functional module tests
**Days 3-4:** Add frontend OAuth and integration tests
**Day 5:** Update existing tests for new architecture

**Deliverable:** Comprehensive test coverage

### Week 4: Polish & Review (Phases 4 & 5)
**Days 1-2:** Update affected existing tests
**Days 3-4:** Documentation review and cross-referencing
**Day 5:** Changelog and final review

**Deliverable:** Branch ready for merge

---

## Success Criteria

### Documentation
- [ ] All new features documented
- [ ] Setup guides complete and tested
- [ ] API reference accurate
- [ ] No outdated information
- [ ] Cross-references work

### Tests
- [ ] All existing tests passing
- [ ] No skipped tests (unless justified)
- [ ] OAuth flows tested
- [ ] Email providers tested
- [ ] Functional modules tested
- [ ] Integration scenarios covered
- [ ] Frontend OAuth tested
- [ ] >80% code coverage on new code

### Quality
- [ ] No linter errors
- [ ] No console warnings in tests
- [ ] All test fixtures accurate
- [ ] Mocks match implementation

---

## Quick Start (For Immediate Action)

**If starting NOW, do in this order:**

1. **Document OAuth** (2-3 hours)
   - Create `docs/GOOGLE_OAUTH_INTEGRATION.md`
   - Move `GET_GOOGLE_OAUTH_CREDENTIALS.md` to `docs/setup/`
   - Move `SYSTEM_EMAIL_OAUTH_FEATURE.md` to `plans/` directory

2. **Fix Broken Tests** (1-2 hours)
   - Run test suite, document failures
   - Fix mock issues in middleware and public-api tests

3. **Add OAuth Tests** (3-4 hours)
   - Create `tests/google-oauth-integration.test.js`
   - Test token management and auth flow

4. **Add Provider Tests** (2-3 hours)
   - Create `tests/email-providers.test.js`
   - Test provider selection logic

5. **Review & Polish** (1-2 hours)
   - Update CLAUDE.md
   - Add changelog entry

**Total Estimated Time:** 9-14 hours for minimum viable testing/documentation

---

## Notes & Considerations

### Known Test Issues to Investigate
- Backend unit test failures (may be acceptable per user)
- Attendance test skips (determine if still relevant)
- Console errors in test output (fixture issues vs real bugs)

### Testing Challenges
- OAuth flows require mocking Google APIs
- Email providers need SMTP/Gmail mocks
- Integration tests may need test Google account
- Frontend OAuth uses popup windows (hard to test)

### Documentation Challenges
- OAuth setup requires Google Cloud Console access
- Some features implemented, some planned (SYSTEM_EMAIL_OAUTH)
- Need to balance detail vs readability
- Multiple audiences (devs, admins, instructors)

