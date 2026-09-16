# Architecture — Performance Discussion Actions

One file, two halves. `buildSpec` returns the SDUI tree on `init`;
`onRipplingEvent` handles every other action as a server round-trip.

---

## Shape of the page

```
root (HStack)
├── sidebar          hand-built nav, sets /nav/section
├── byTeamMember     visible when section is "/by-team-member"
│   ├── selectionColumn + infoColumn
│   ├── createSection      → discussionDetailsCard (/created)
│   └── reviewSection      → discussionDetailsCard (/editing)
├── byDepartment     visible when section is "/by-department"
└── SnackBar         bound to /submission/result
```

---

## Two workspaces

`discussionDetailsCard` is a factory taking a namespace of state roots, so the
same card renders twice against different state. A manager can draft a new
discussion and revise an existing one without either disturbing the other.

| Workspace | record | details | cards | submission |
| --- | --- | --- | --- | --- |
| Create | `/created` | `/details` | `/cards` | `/submission` |
| Review | `/editing` | `/editDetails` | `/editCards` | `/editSubmission` |

The create instance also passes `afterSubmit`, a list of `setState` actions
that blank the form once a submit goes through.

---

## Section visibility is computed server-side

The SDUI layer cannot express "not positive and not termination", so
`toRecordHeader` computes each card's visibility into a `"yes"` / `""` string
on the record header:

```typescript
showFeedback:    positive ? "yes" : "",
showIncident:    positive ? "" : "yes",
showPriorMatters: positive ? "" : "yes",
showAddtlInfo:   termination ? "yes" : "",
showActionPlan:  !positive && !termination ? "yes" : "",
isAbandonment:   abandonment ? "yes" : "",
```

The spec compares against those flags with plain `equals`. Same reasoning
behind `dateBounds`, which holds six precomputed date ceilings.

---

## Card save cycle

Each card follows the same pattern:

1. Fields bound to `/{details}/...`, disabled once saved.
2. **Validate & Save** calls the matching server action.
3. Server validates, patches, and returns `{ error, saved }`.
4. `saved: "yes"` swaps the button for **Edit** and locks the fields.
5. **Edit** clears `saved`, unlocking them again.

Validation returns the first failure only, so the manager fixes one thing at a
time.

---

## Handler actions

| Action | Returns to | Notes |
| --- | --- | --- |
| `init` | — | The spec, as a JSON string |
| `loadEmployee` | `/employee` | Worker and discussions fetched in parallel; blocks self-selection |
| `createDiscussion` | `/created` | Returns a full `RecordHeader` including date bounds |
| `loadForEdit` | `/editing` | Header fields for an existing record |
| `loadEditDetails` | `/editDetails` | Saved inputs for the same record |
| `saveFeedback` … `saveComms` | `/{cards}/{key}` | Six card saves, same response shape |
| `submitDiscussion` | `/{submission}` | Save sets attestation only; Submit starts approval |
| `confirmDocument` | `/history/message` | Sets the document-generation trigger |
| `loadDepartments` | `/department/options` | `Parent > Child` labels |
| `loadByDepartment` | `/department` | Pages internally within a time budget, then sorts |

---

## By Department

Different shape from the team-member view: filters, then one aggregated load.

The handler pages through results inside a ~14-second budget, sorts everything
it gathered newest-first, then filters by status in JS — the query cannot
express "Draft or unset", and an unset status counts as Draft.

If the budget runs out before the cursor does, the message tells the manager to
narrow the timeframe.

Because `responsePath: "/department"` replaces the whole object, the request
echoes `options` and `hasOptions` back through its inputs so they survive.

---

## Timeouts

| Constant | Value | Why |
| --- | --- | --- |
| `REQUEST_TIMEOUT_MS` | 6000 | Default for every call |
| `DEPT_TIMEOUT_MS` | 8000 | The department traversal is slower |
| `DEPT_BUDGET_MS` | 14000 | Stop paging in time to respond before the 20s kill |

---

## Conventions worth keeping

- Server-side errors return **200 with a message in the body**, so the UI can
  show it. Only `submitDiscussion` returns 500, deliberately.
- The `message` field on every `FunctionResponse` is the debugging surface.
  It shows in the Executions tab and has carried most of this project's
  diagnostics.
- Dates are `YYYY-MM-DD` strings and compared as strings, which sidesteps the
  timezone shifts `Date.parse` introduces.
- `NO_DATE` (`"0000-00-00"`) is a deliberate placeholder so an unset date reads
  as intentional rather than broken.
