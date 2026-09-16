# Platform quirks

Behaviors of `@rippling/pebble-sdui-web` that are undocumented, documented
incorrectly, or documented but non-functional. Each was found by experiment.

Read this before writing a new function page.

---

## `onSuccess` never fires

`triggerFunction` documents an optional `onSuccess` parameter. It does not run
— tested with an action array, with a single action, and against a clean 200
response.

**Instead:** put follow-up actions in the button's `press` array.

```typescript
on: {
  press: [
    triggerFunction({ /* ... */ }),
    setState({ statePath: "/some/path", value: "" }),
  ],
},
```

---

## Actions after a `triggerFunction` in `press` do not run

Following from the above: entries placed *after* a `triggerFunction` in a
`press` array are skipped. Entries placed *before* it do run.

**Instead:** either accept that the follow-up fires alongside the request
rather than after it, or drive the UI from the response via `responsePath` and
a `visible` binding.

The working pattern for a post-submit confirmation:

```typescript
// Server writes { result: "Submitted for approval." } to /submission
SnackBar({
  props: {
    isVisible: equals($state("/submission/result"), "Submitted for approval."),
  },
  on: {
    dismiss: setState({ statePath: "/submission/result", value: "" }),
  },
}),
```

---

## `$cond` produces values, not conditions

`visible` needs a condition object — `equals`, `neq`, or `truthy`. Passing a
`$cond` renders rather than erroring, which makes this hard to spot: the
element simply shows when it should not.

```typescript
// Wrong — renders, but always visible
visible: $cond(isPositive, false, true),

// Right
visible: equals($state("/created/showFeedback"), "yes"),
```

Conversely, `isDisabled` needs a real boolean, so a condition has to be wrapped:

```typescript
const disabledWhen = (c: unknown) => $cond(c, true, false);
```

---

## No `and`, `or`, or `not`

The SDK ships `equals`, `neq`, and `truthy`. There is no way to combine them.

**Instead:** compute the combined condition server-side into a `"yes"` / `""`
flag on the record, and compare against that.

```typescript
// Server
showActionPlan: !positive && !termination ? "yes" : "",

// Spec
visible: equals($state(`${ns.record}/showActionPlan`), "yes"),
```

---

## `$template` does not resolve row references inside a `repeat`

`row.$("id")` inside a `$template` yields nothing usable. The template itself
works fine outside a repeat.

**Instead:** build the finished string server-side and bind it whole.

```typescript
// Server, in the row mapper
url: `${RECORD_URL}${r.id ?? ""}`,

// Spec
to: { path: row.$("url"), openInNewTab: true },
```

---

## `navigate` is app-relative; `Button`'s `to` is not

The `navigate` action is documented as "Route change within the app," and that
is literal — an absolute `https://` URL gets treated as a path. `AppNavBar`
has the same problem: clicking an item performs a real browser navigation to a
route that does not exist.

**Instead:** use `Button`'s `to` prop, which renders an anchor.

```typescript
Button({
  props: {
    label: "View",
    to: { path: row.$("url"), openInNewTab: true },
  },
}),
```

For in-page section switching, build the nav by hand from Buttons and
`setState` rather than using `AppNavBar`.

---

## Other constraints

- **Settings keys are lowercased** by the platform. `customObject_apiName_pd`
  becomes `customobject_apiname_pd`.
- **Functions are killed at 20 seconds** with no response body. Use
  `AbortController` on every fetch so a hung upstream is catchable.
- **`isEmpty` does not work on arrays.** `equals($state(p), "")` never matches
  an empty array. Keep a companion string flag if you need to gate on one.
- **`responsePath` replaces the whole object** at that path. Anything the
  response omits is lost — echo it back through the request inputs if it needs
  to survive.
- **The rich text component silently drops `setValue`.** This is why the canvas
  version was abandoned in favour of Function Pages.
- **`AppState` must use `type`, not `interface`** — the SDK's generic has an
  index signature constraint an interface cannot satisfy.
- **`render({ root, state })` needs the real state object.** Passing `{}`
  discards the declared state and fails at runtime.
