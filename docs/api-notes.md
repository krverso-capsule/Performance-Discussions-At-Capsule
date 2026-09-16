# API notes

Endpoint shapes and query syntax for `https://rest.ripplingapis.com`, worked
out by experiment. Where something is unverified it says so.

---

## Custom object queries

```
POST /custom-objects/{api_name}/records/query/
{ "query": "...", "limit": 100, "cursor": "..." }
```

The query goes in the **body**, not as a URL parameter.

**Syntax that works:**

- `owner_role.id = '68da8f24...'` — `=`, not `eq`. Dot notation traverses
  into edge fields.
- `owner_role.department.id = '...'` — a second hop works, but runs slowly
  enough to need a longer timeout than other calls.
- `a = '...' or b = '...'` — clauses combine with `or`.

**Constraints:**

- `limit: 0` returns 400. Use a positive integer.
- Paginate with `cursor` from the response. A repeated cursor means the API is
  handing back the same page; break rather than loop.
- `order_by` is **unverified**. The code sends `"created_date__c desc"` and
  falls back to an unordered query on 400 or timeout. Results are sorted in JS
  regardless, so ordering is correct either way.

**Response:** `{ results: [...], cursor: "..." | null }`

---

## Records

```
GET    /custom-objects/{api_name}/records/{id}/
PATCH  /custom-objects/{api_name}/records/{id}/
POST   /custom-objects/{api_name}/records/
```

- Record ids are UUIDs. Role ids are 24-character hex.
- The create response is an envelope:
  `{ breaking_errors, data, write_errors }`. Read `data`.
- **Date fields need `null` to clear, not `""`.**
- `discussion_reason__c` is a **multi-select** — send an array. A bare string
  produces a 400.

---

## Workers

```
GET /workers/{id}?expand=department,user,manager
```

**Expand does not recurse.** Each of these needs its own follow-up fetch:

- `department.parent` → `GET /departments/{parent_id}`
- `manager.user` → `GET /workers/{manager_id}?expand=user`
- work location → `GET /work-locations/{work_location_id}` *(path inferred,
  lightly tested)*

A worker record has no name field — the display name lives on the linked user
at `worker.user.display_name`.

---

## Departments

```
GET /departments
```

Returns roughly 50 rows for Capsule. Each carries `id`, `name`, and
`parent_id`. Pagination behavior is **unverified** — the current code reads one
page.

Sub-department names repeat across parents ("Clinical Services" appears twice),
so labels are composed as `Parent > Child` using a two-pass id lookup.

The list is **company-wide**. It is not scoped to the viewer's own org. See
`open-items.md`.

---

## Function context

`context` carries four keys: `env`, `function`, `settings`, `outputsURL`.

The viewer's own role id is at **`context.function.role_id`** — not under a
`user` or `actor` key. It matches the 24-character hex format that worker
endpoints use, so it compares directly against a selected employee id.

`context.env` holds `rippling_user_bearer_token`. In testing this returned the
literal string `TOKEN_USER_BEARER`, which may be a placeholder — using it for
a scoped request is untested.

`event` carries `parameters` and `trigger_type` only.

---

## Record field names

Written by this app:

| Field | Set by |
| --- | --- |
| `owner_role` | create |
| `discussion_type__c`, `discussion_reason__c`, `warning_level__c` | create |
| `status__c` | create (`"Draft"`) |
| `submission_attestation__c`, `submission_attestation_confirmation__c` | create, submit |
| `create_via_app__c`, `submit__c`, `submit_via_app__c`, `request_approval__c` | create, submit |
| `date_of_feedback__c`, `feedback_details_00__c` | Feedback card |
| `ncns_date_1__c` … `ncns_date_3__c`, `date_of_incident__c`, `description_of_incident_00__c` | Incident card |
| `show_violations_and_occurrences__c`, `prior_matters_00__c` | Prior Matters card |
| `show_additional_context__c`, `additional_context_00__c` | Additional Info card |
| `show_action_plan__c`, `action_plan_00__c` | Action Plan card |
| `show_communication_details__c`, `communication_date__c`, `communication_method__c`, `witness__c` | Comms card |
| `create_discussion_document__c` | Confirm Document |
| `submitted_by__c`, `last_changed_by__c` / `changed_by__c`, `discussion_document_created_by__c` | audit fields — **names need verifying against the object** |

Read but not written: `name`, `created_date__c`, `finalized_date_date_only__c`,
`monitoring_period_end_date__c`, `date_submitted_date_only__c`,
`discussion_document_sent_date__c`, `active_memo__c`, `active_warning__c`,
`created_by`.
