# Open items

Unverified assumptions, known gaps, and decisions still to make.

---

## Needs verifying before wider rollout

**Audit field names.** `submitted_by__c`, the changed-by field, and
`discussion_document_created_by__c` were added without checking them against
the object definition. Two different names are in use for what looks like one
field — `last_changed_by__c` on create, `changed_by__c` on submit. A wrong
name fails the whole patch, so a save that works today could start failing.

**Whether those fields want a role id or a worker id.** They are currently sent
role ids, matching `owner_role` and `witness__c`.

**`order_by` on the query endpoint.** Sent as `"created_date__c desc"` with a
fallback. Check the Executions log for `ordered=true` / `ordered=false` to see
which path ran.

**`/departments` pagination.** The code reads one page. 50 rows came back for
Capsule, which may or may not be everything.

---

## Known gaps

**The department list is company-wide.** Every manager can query discussions
for any department. The original intent was to scope it to what the viewer can
see, but the app token carries its own permissions and Rippling's per-user
scoping is not applied.

Options, none yet taken:
- Probe `context.env.rippling_user_bearer_token` against `/departments` and see
  whether a scoped list comes back. It returned the literal string
  `TOKEN_USER_BEARER` in testing, so it may be a placeholder.
- Derive the allowed set from the viewer's own worker record — their
  department plus its children.
- Accept it and handle access at the page-permission level instead.

**File uploads are validated but not stored.** `commRecording` and `commEmail`
hold base64 data URLs. Whether the record's attachment fields accept that form
was never confirmed, so `saveComms` validates them and writes everything else.

**Confirm Document does not lock after success.** Pressing it twice regenerates
the document.

**Submitting from Review shows no confirmation.** The snackbar watches
`/submission/result`; the review workspace writes `/editSubmission/result`. A
second SnackBar bound to that path would cover it.

---

## Content review pending

The Action Plan static text was written for warnings and is now shown for
Memos of Conversation too. The opening line and the Warning Level sentence
branch correctly, but two others still read as a warning:

- "The observations in this **notice**…"
- "…further disciplinary action will be taken, up to and including termination
  of employment."

Worth reading the whole block with a memo in mind.

---

## Housekeeping

**Rotate the API key** shown in screenshots early in development.

**The file is ~1,800 lines** and has lost blocks in several copy-paste
round-trips. Now that it is in version control this matters less, but splitting
the spec builder from the handler would make review easier.

**Self-selection detection.** The guard now works, but it only covers this
page. A saved view filtered to records where `created_by` matches `owner_role`
would catch self-discussions created by any route.
