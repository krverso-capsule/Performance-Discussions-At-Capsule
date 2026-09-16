import { createSpec, equals, neq } from "@rippling/pebble-sdui-web";
import {
  AtomsSeparator,
  Box,
  Button,
  Card,
  Checkbox,
  HStack,
  Heading,
  Select,
  Tab,
  Text,
  VStack,
  render,
  setState,
} from "@rippling/pebble-sdui-web/catalogs/custom-apps";
import {
  FunctionContext,
  FunctionEvent,
  FunctionResponse,
} from "@rippling/rippling-sdk";

const SUPPORT_CONTACT = "peopleops@capsule.com";

const ACTIONS_PAGE_URL =
  "https://app.rippling.com/custom-apps/0d1161c326c14d72b9c7b534/sdui/6aa480232c8883ae1afdb7e3";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

type AppState = {
  nav: { tab: string };
  planner: { type: string; reason: string; level: string };
  /** Ticked as the manager works through the conversation, not the form. */
  checklist: {
    specifics: boolean;
    history: boolean;
    details: boolean;
    support: boolean;
    listened: boolean;
    spoke: boolean;
    sectionsSaved: boolean;
    attestation: boolean;
  };
  /** Which troubleshooting entry is open. "" when all are closed. */
  faq: { open: string };
};

const initialState: AppState = {
  nav: { tab: "before" },
  planner: { type: "", reason: "", level: "" },
  checklist: {
    specifics: false,
    history: false,
    details: false,
    support: false,
    listened: false,
    spoke: false,
    sectionsSaved: false,
    attestation: false,
  },
  faq: { open: "" },
};

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

function buildSpec(_context: FunctionContext) {
  const { $state, $cond } = createSpec<AppState>({ state: initialState });

  const isTab = (id: string) => equals($state("/nav/tab"), id);

  // -- Text helpers --------------------------------------------------------

  const body = (text: string) =>
    Text({ props: { text, typestyle: "typestyleBodyMedium" } });

  const lede = (text: string) =>
    Text({
      props: {
        text,
        typestyle: "typestyleBodyLarge",
        color: "colorOnSurfaceVariant",
      },
    });

  const subhead = (text: string) => Heading({ props: { level: 3, text } });

  const quiet = (text: string) =>
    Text({
      props: {
        text,
        typestyle: "typestyleBodySmall",
        color: "colorOnSurfaceVariant",
      },
    });

  /** A callout for something that can go wrong if missed. */
  const note = (text: string, visible?: unknown) =>
    Box({
      visible,
      props: {
        padding: "space300",
        backgroundColor: "colorSurfaceContainer",
        borderLeft: "3px solid var(--color-error)",
        radius: "shapeCornerSm",
      },
      children: [Text({ props: { text, typestyle: "typestyleBodySmall" } })],
    });

  /**
   * One of the four guidance principles.
   *
   * The left border does the grouping, so these read as a set without needing
   * numbers — they are not a sequence.
   */
  const principle = (title: string, text: string) =>
    Box({
      props: {
        padding: "space300",
        borderLeft: "2px solid var(--color-outline)",
      },
      children: [
        VStack({
          props: { gap: "space100" },
          children: [
            Text({ props: { text: title, typestyle: "typestyleBodyMedium600" } }),
            body(text),
          ],
        }),
      ],
    });

  /** A numbered step. Used only where the content really is sequential. */
  const step = (n: string, title: string, lines: string[]) =>
    HStack({
      props: { gap: "space300", align: "flex-start", wrap: "nowrap" },
      children: [
        Box({
          props: { width: "28px", shrink: 0 },
          children: [
            Text({
              props: {
                text: n,
                typestyle: "typestyleBodyMedium600",
                color: "colorPrimary",
              },
            }),
          ],
        }),
        VStack({
          props: { gap: "space100", grow: 1 },
          children: [
            Text({ props: { text: title, typestyle: "typestyleBodyMedium600" } }),
            ...lines.map((l) => body(l)),
          ],
        }),
      ],
    });

  /** Label above a value, used in the planner's summary row. */
  const fact = (label: string, value: unknown, visible?: unknown) =>
    VStack({
      visible,
      props: { gap: "space050", basis: "240px" },
      children: [
        Text({
          props: {
            text: label,
            typestyle: "typestyleBodySmall600",
            color: "colorOnSurfaceVariant",
          },
        }),
        Text({ props: { text: value, typestyle: "typestyleBodyLarge" } }),
      ],
    });

  // =========================================================================
  // Tab — Before you start
  // =========================================================================

  const beforeTab = VStack({
    visible: isTab("before"),
    props: { gap: "space400" },
    children: [
      Heading({ props: { level: 2, text: "Before you start" } }),
      lede("Four things worth holding in mind, whatever the discussion is about."),
      body(
        "Discussions about attendance, performance, and behavior are how team members learn where they stand. Done well, they open a path forward. Done carelessly, they close one. Continuous feedback enables team members to assess their development and gain insight into areas of improvement and advancement — and because we win together, their progress is inseparable from ours."
      ),
      principle(
        "Assume they can improve",
        "A performance discussion is not meant to leave someone feeling scared, inadequate, or devalued. Go in assuming improvement is possible — the goal is to help them get there."
      ),
      principle(
        "Let them speak first",
        "Give the team member room to reflect on their own performance before you deliver yours. How they describe the situation tells you a great deal about their self-awareness and what they understand the job to require."
      ),
      principle(
        "Bring specifics, not impressions",
        "Dates, times, what was observed, who else was involved or affected. Specifics keep the conversation on deliverables and results. Generalizations invite argument about whether the thing even happened."
      ),
      principle(
        "Say what support looks like",
        "Name the coaching, tools, or resources you'll provide. A discussion that only describes a gap is a verdict; one that describes a path is an opportunity."
      ),
    ],
  });

  // =========================================================================
  // Tab — Where things live
  // =========================================================================

  const whereTab = VStack({
    visible: isTab("where"),
    props: { gap: "space400" },
    children: [
      Heading({ props: { level: 2, text: "Where things live" } }),
      lede("The Performance Dashboard has two tabs you'll use."),

      subhead("Data Dashboard"),
      body(
        "Current attendance point balances and discussion history for your team, in two tables. The filters across the top narrow both at once — by employee, manager, department, work location, discussion type, warning level, status, or date range."
      ),
      body(
        "Use this to see the shape of things before you act: whether a pattern exists, whether someone already has an active warning, how recent the last discussion was."
      ),

      subhead("Performance Discussion Actions"),
      body(
        "Where you create and manage discussions. The left sidebar has two views: By Team Member, which is where everything happens, and By Department, a read-only list across a whole department. "
      ),
      body(
        "By Team Member opens by default. Select a team member, confirm their details, then open a new discussion or revisit one already underway."
      ),
      quiet(
        "Create a discussion walks through the whole sequence, from selecting someone to submitting."
      ),
    ],
  });

  // =========================================================================
  // Tab — Who can do what
  // =========================================================================

  const accessTab = VStack({
    visible: isTab("access"),
    props: { gap: "space400" },
    children: [
      Heading({ props: { level: 2, text: "Who can do what" } }),
      lede(
        "Access follows the reporting line. What you can do with a discussion depends on where you found it."
      ),

      subhead("Your team"),
      body(
        "Direct and indirect managers have access to every action on their own team members, up to four levels down the reporting line. You don't need to request anything — if someone reports to you, or reports to someone who reports to you, they'll be in your search results."
      ),
      body(
        "The one exception is approving a discussion. That belongs to People Operations, and the Approve button only appears for them."
      ),

      subhead("Expanded access"),
      body(
        "Some team members need access beyond their own reports — supporting another manager's team, or covering a department they don't manage. That isn't granted by default."
      ),
      body(
        `To request it, email ${SUPPORT_CONTACT} with who needs access, whose discussions they need to reach, and why. People Operations will set it up.`
      ),

      AtomsSeparator({ props: {} }),
      subhead("By Team Member vs By Department"),
      body(
        "The two views in the left sidebar show the same records but offer different actions."
      ),

      VStack({
        props: { gap: "space400" },
        children: [
          step("", "By Team Member", [
            "Everything: create a new discussion, edit one in progress, cancel it, send a document, and — for People Operations — approve.",
            "This is the only place a discussion can be created or changed.",
          ]),
          step("", "By Department", [
            "Read-only. You can see every discussion in a department and open any record, but there's no create, no edit, and no cancel.",
            "Use it to spot patterns or check what's outstanding. To act on anything you find, go back to By Team Member and select that person.",
          ]),
        ],
      }),
    ],
  });

  // =========================================================================
  // Tab — Plan a discussion
  // =========================================================================

  const pType = "/planner/type";
  const pReason = "/planner/reason";
  const pLevel = "/planner/level";

  const isWarning = equals($state(pType), "Warning");
  const isTermination = equals($state(pType), "Termination Notice");
  const isPositive = equals($state(pReason), "Positive Feedback");
  const isAbandonment = equals($state(pReason), "Job Abandonment");
  const isAttendance = equals($state(pReason), "Attendance");

  // `visible` takes a condition helper, not a computed value — a nested $cond
  // returns a value and renders truthy on both branches, which showed the
  // placeholder and the results at the same time.
  const reasonChosen = neq($state(pReason), "");
  const reasonEmpty = equals($state(pReason), "");
  const levelEmpty = equals($state(pLevel), "");

  const reasonSelect = (type: string, options: string[]) =>
    Select({
      visible: equals($state(pType), type),
      props: {
        label: "Reason",
        placeholder: "Select a reason",
        list: options.map((o) => ({ label: o, value: o })),
        value: { $bindState: pReason },
      },
    });

  /**
   * One row of the "sections you'll fill in" list.
   *
   * The marker, the colour, and the explanation all switch together, so each
   * is computed from the same condition rather than rendering two rows.
   */
  const sectionRow = (
    name: string,
    on: unknown,
    whyOn: string,
    whyOff: string
  ) =>
    HStack({
      props: { gap: "space200", align: "baseline", wrap: "nowrap" },
      children: [
        Text({
          props: {
            text: $cond(on, "●", "○"),
            typestyle: "typestyleBodyMedium",
            color: $cond(on, "colorPrimary", "colorOnSurfaceVariant"),
          },
        }),
        Text({
          props: {
            text: name,
            typestyle: "typestyleBodyMedium600",
            color: $cond(on, "colorOnSurface", "colorOnSurfaceVariant"),
          },
        }),
        Text({
          props: {
            text: $cond(on, whyOn, whyOff),
            typestyle: "typestyleBodySmall",
            color: "colorOnSurfaceVariant",
          },
        }),
      ],
    });

  const planTab = VStack({
    visible: isTab("plan"),
    props: { gap: "space400" },
    children: [
      Heading({ props: { level: 2, text: "Plan a discussion" } }),
      lede("Pick a type and a reason to see what you'll be asked for."),

      Card({
        props: { title: "" },
        children: [
          // Card does not pad its children, so the content carries its own.
          Box({
            props: { padding: "space500" },
            children: [
              VStack({
                props: { gap: "space500" },
                children: [
                  HStack({
                    props: {
                      gap: "space400",
                      wrap: "wrap",
                      align: "flex-start",
                    },
                    children: [
                      Select({
                        props: {
                          label: "Discussion type",
                          placeholder: "Select a type",
                          list: [
                            {
                              label: "Memo of Conversation",
                              value: "Memo of Conversation",
                            },
                            { label: "Warning", value: "Warning" },
                            {
                              label: "Termination Notice",
                              value: "Termination Notice",
                            },
                          ],
                          value: { $bindState: pType },
                        },
                      }),

                      // Reason options differ per type, so each type has its
                      // own Select bound to the same path and shown only for
                      // that type.
                      reasonSelect("Memo of Conversation", [
                        "Attendance",
                        "Performance",
                        "Behavior",
                        "Misconduct / Violation of Company Policy",
                        "Positive Feedback",
                      ]),
                      reasonSelect("Warning", [
                        "Attendance",
                        "Performance",
                        "Behavior",
                        "Misconduct / Violation of Company Policy",
                      ]),
                      reasonSelect("Termination Notice", [
                        "Attendance",
                        "Performance",
                        "Behavior",
                        "Misconduct / Violation of Company Policy",
                        "Job Abandonment",
                      ]),

                      Select({
                        visible: isWarning,
                        props: {
                          label: "Warning level",
                          placeholder: "Select a level",
                          list: [
                            { label: "First", value: "First" },
                            { label: "Second", value: "Second" },
                            { label: "Final", value: "Final" },
                          ],
                          value: { $bindState: pLevel },
                        },
                      }),
                    ],
                  }),

                  AtomsSeparator({ props: {} }),

                  // Nothing chosen yet.
                  Text({
                    visible: reasonEmpty,
                    props: {
                      text: "Choose a type and reason above.",
                      typestyle: "typestyleBodyMedium",
                      color: "colorOnSurfaceVariant",
                    },
                  }),

                  // A warning needs a level before the facts mean anything.
                  // Nested inside an isWarning wrapper so the prompt does not
                  // appear for types that have no level.
                  VStack({
                    visible: isWarning,
                    props: { gap: "space200" },
                    children: [
                      Text({
                        visible: levelEmpty,
                        props: {
                          text: "Choose a warning level to see the monitoring period.",
                          typestyle: "typestyleBodyMedium",
                          color: "colorOnSurfaceVariant",
                        },
                      }),
                    ],
                  }),

                  VStack({
                    visible: reasonChosen,
                    props: { gap: "space500" },
                    children: [
                      HStack({
                        props: { gap: "space500", wrap: "wrap" },
                        children: [
                          fact(
                            "Warning type",
                            $cond(
                              equals($state(pLevel), "First"),
                              "Verbal",
                              $cond(
                                equals($state(pLevel), "Second"),
                                "Written",
                                $cond(
                                  equals($state(pLevel), "Final"),
                                  "Final Written",
                                  "—"
                                )
                              )
                            ),
                            isWarning
                          ),
                          fact(
                            "Monitoring period",
                            // Attendance follows the team member's policy;
                            // otherwise the level decides.
                            $cond(
                              isAttendance,
                              "90 or 180 days, depending on their attendance policy",
                              $cond(
                                equals($state(pLevel), "Final"),
                                "180 days",
                                $cond(
                                  equals($state(pLevel), ""),
                                  "—",
                                  "90 days"
                                )
                              )
                            ),
                            isWarning
                          ),
                          fact(
                            "Document sends",
                            $cond(
                              isTermination,
                              "After you confirm",
                              "Automatically on approval"
                            )
                          ),
                        ],
                      }),

                      VStack({
                        props: { gap: "space200" },
                        children: [
                          Text({
                            props: {
                              text: "Sections you'll fill in",
                              typestyle: "typestyleBodySmall600",
                            },
                          }),
                          sectionRow(
                            "Feedback Details",
                            isPositive,
                            "Date of feedback, and what was said",
                            "Only for Positive Feedback"
                          ),
                          sectionRow(
                            "Incident Details",
                            $cond(isPositive, false, true),
                            $cond(
                              isAbandonment,
                              "Three no-call-no-show dates, then the details",
                              "Date of incident, and what happened"
                            ),
                            "Not used for Positive Feedback"
                          ),
                          sectionRow(
                            "Prior Matters",
                            $cond(isPositive, false, true),
                            "Optional — link any active discussions",
                            "Not used for Positive Feedback"
                          ),
                          sectionRow(
                            "Additional Information",
                            isTermination,
                            "Optional context before the standard summary",
                            "Only for Termination Notices"
                          ),
                          sectionRow(
                            "Action Plan",
                            $cond(
                              isPositive,
                              false,
                              $cond(isTermination, false, true)
                            ),
                            "Optional — what improvement looks like",
                            "Not used for this type"
                          ),
                          sectionRow(
                            "Proof of Communication",
                            true,
                            "Date, method, and any recording or email",
                            ""
                          ),
                        ],
                      }),

                      note(
                        "The document waits until you confirm you've spoken with the team member. See Termination notices.",
                        isTermination
                      ),
                      note(
                        "You'll need three no-call-no-show dates in order, each on or before the discussion date. The third becomes the date of incident.",
                        isAbandonment
                      ),
                    ],
                  }),

                  HStack({
                    props: { justify: "flex-end" },
                    children: [
                      Button({
                        props: {
                          appearance: "GHOST",
                          label: "Clear",
                          size: "S",
                        },
                        on: {
                          press: [
                            setState({ statePath: pType, value: "" }),
                            setState({ statePath: pReason, value: "" }),
                            setState({ statePath: pLevel, value: "" }),
                          ],
                        },
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // =========================================================================
  // Tab — Create a discussion
  // =========================================================================

  const createTab = VStack({
    visible: isTab("create"),
    props: { gap: "space400" },
    children: [
      Heading({ props: { level: 2, text: "Create a discussion" } }),
      lede(
        "Start to finish, in By Team Member. Each section of the form saves on its own."
      ),

      VStack({
        props: { gap: "space400" },
        children: [
          step("1", "Select the team member", [
            "Use the search field at the top of By Team Member to find the person this discussion concerns. You won't appear in your own results.",
          ]),
          step("2", "Confirm their information", [
            "Title, department, manager, work location, start date, and discussion counts appear in the right-hand panel. Give it a quick check — if anything's wrong, fix it on their profile first.",
            "The panel takes a moment to populate, and the action buttons stay disabled until it does.",
          ]),
          step("3", "Click Create New Discussion", [
            "Pick a type and reason, then confirm the attestation to open the record. Those choices lock once the record exists — the planner tab shows what each combination will ask for.",
          ]),
          step("4", "Fill in each section and save it", [
            "Only the sections relevant to your type and reason appear. Click Validate & Save on each; when it succeeds the button is replaced by Edit and the fields lock. That's your confirmation it's saved.",
          ]),
          step("5", "Complete the attestation and submit", [
            "Every section must be saved before you can submit. Save records the attestation without starting approval; Submit sends it to the People team.",
            "The attestation is a commitment, not a formality. By checking it you confirm the details are accurate and that you have shared them with the team member — or, for a termination notice, that you will once it's finalized. Whoever submits carries that responsibility.",
            "After a successful submit, a confirmation appears and the section clears itself. The discussion you just submitted is in Review Existing Discussions.",
          ]),
        ],
      }),

      AtomsSeparator({ props: {} }),
      subhead("Two things that will trip you up"),
      body(
        "Pasting long text can fail validation. If a section won't save after a paste, retype a few words anywhere in the text and try again. That's usually enough."
      ),
      body(
        "Editing a saved section unlocks it again. Click Edit, make your change, and save that section a second time. Nothing is lost — it just needs re-confirming."
      ),

      AtomsSeparator({ props: {} }),
      subhead("Proof of Communication"),
      body(
        "This section records a conversation that already happened — the one you had with the team member before opening the record. It isn't the discussion document, and it isn't a notification."
      ),
      body(
        "Set the date you spoke, how you spoke, and attach whatever evidence exists. A recording is required for Phone Call and Voice Mail, since those are the only two methods with no written trail. If a colleague was present, name them as a witness."
      ),

      AtomsSeparator({ props: {} }),
      subhead("Working checklist"),
      quiet("For the conversation itself. This resets when you leave the page."),

      VStack({
        props: { gap: "space200" },
        children: [
          Checkbox({
            props: {
              label:
                "I've gathered dates, times, and specifics rather than impressions",
              value: { $bindState: "/checklist/specifics" },
            },
          }),
          Checkbox({
            props: {
              label:
                "I've checked their attendance balance and discussion history on the Data Dashboard",
              value: { $bindState: "/checklist/history" },
            },
          }),
          Checkbox({
            props: {
              label:
                "I've confirmed their details in the right-hand panel are correct",
              value: { $bindState: "/checklist/details" },
            },
          }),
          Checkbox({
            props: {
              label: "I've decided what support or coaching I'm offering",
              value: { $bindState: "/checklist/support" },
            },
          }),
          Checkbox({
            props: {
              label:
                "I've given the team member room to describe the situation first",
              value: { $bindState: "/checklist/listened" },
            },
          }),
          Checkbox({
            props: {
              label: "I've had the conversation before creating the document",
              value: { $bindState: "/checklist/spoke" },
            },
          }),
          Checkbox({
            props: {
              label: "Every section shows Edit rather than Validate & Save",
              value: { $bindState: "/checklist/sectionsSaved" },
            },
          }),
          Checkbox({
            props: {
              label: "I've read the attestation before checking it",
              value: { $bindState: "/checklist/attestation" },
            },
          }),
        ],
      }),
    ],
  });

  // =========================================================================
  // Tab — Review existing
  // =========================================================================

  /** One row of the status reference. */
  const statusRow = (status: string, means: string, can: string) =>
    HStack({
      props: { gap: "space400", align: "flex-start", wrap: "nowrap" },
      children: [
        Box({
          props: { basis: "130px", shrink: 0 },
          children: [
            Text({
              props: { text: status, typestyle: "typestyleBodyMedium600" },
            }),
          ],
        }),
        Box({ props: { basis: "260px", shrink: 1 }, children: [body(means)] }),
        Box({ props: { grow: 1 }, children: [body(can)] }),
      ],
    });

  const columnHead = (text: string, basis?: string, grow?: number) =>
    Box({
      props: grow ? { grow } : { basis, shrink: basis === "130px" ? 0 : 1 },
      children: [
        Text({
          props: {
            text,
            typestyle: "typestyleBodySmall600",
            color: "colorOnSurfaceVariant",
          },
        }),
      ],
    });

  const reviewTab = VStack({
    visible: isTab("review"),
    props: { gap: "space400" },
    children: [
      Heading({ props: { level: 2, text: "Review existing discussions" } }),
      lede(
        "Two ways to find a record: one team member at a time, or a whole department at once."
      ),

      subhead("By Team Member"),
      body(
        "Select someone, then open Review Existing Discussions. Their history is grouped into four tabs by where each discussion has got to."
      ),

      VStack({
        props: { gap: "space300" },
        children: [
          HStack({
            props: { gap: "space400", wrap: "nowrap" },
            children: [
              columnHead("Status", "130px"),
              columnHead("What it means", "260px"),
              columnHead("What you can do", undefined, 1),
            ],
          }),
          AtomsSeparator({ props: {} }),
          statusRow(
            "In Progress",
            "Created but not finalized",
            "Keep editing or cancel it — and approve, if you're in People Operations"
          ),
          statusRow(
            "Active",
            "Finalized, with a warning or memo still in effect",
            "Create and send the discussion document"
          ),
          statusRow(
            "Archived",
            "Finalized, monitoring period passed",
            "View, and send a document for terminations or positive feedback"
          ),
          statusRow(
            "Canceled",
            "Withdrawn before completion",
            "View, and edit if it needs reopening"
          ),
        ],
      }),

      body(
        "The list reflects what was there when the page loaded. If you've saved something in another tab, use Click to reload recent changes above the tabs."
      ),
      body(
        "For everything except termination notices, the document sends automatically once the discussion is approved."
      ),

      AtomsSeparator({ props: {} }),
      subhead("By Department"),
      body(
        "A read-only view of every discussion in a department, rather than one team member at a time. Useful for spotting patterns, or checking what's outstanding before a cycle closes."
      ),

      VStack({
        props: { gap: "space400" },
        children: [
          step("1", "Click Load departments", [
            "The dropdown stays disabled until you do. The list takes a few seconds to build and only needs loading once per visit.",
          ]),
          step("2", "Pick a department and a timeframe", [
            "One department at a time. The timeframe limits how far back the search goes — it opens on the last week, and a shorter window returns faster.",
          ]),
          step("3", "Narrow by status, if you want to", [
            "Leave Status empty to include everything. Draft covers records where no status has been set yet.",
          ]),
          step("4", "Click Load discussions", [
            "Results are listed newest first, each with the team member's name. View opens the record in a new tab.",
          ]),
        ],
      }),

      note(
        "This view is read-only. To create, edit, or cancel a discussion, find the person under By Team Member."
      ),
      body(
        "If the message says more records exist, narrow the timeframe. A department with a long history can hold more than one load can return."
      ),
    ],
  });

  // =========================================================================
  // Tab — Termination notices
  // =========================================================================

  const terminationTab = VStack({
    visible: isTab("termination"),
    props: { gap: "space400" },
    children: [
      Heading({ props: { level: 2, text: "Termination notices" } }),
      lede("The one type where the document waits for you."),
      body(
        "Every other discussion type sends its document automatically on approval. Termination notices don't — because the team member needs to hear this from you, not from an automated email."
      ),

      VStack({
        props: { gap: "space400" },
        children: [
          step("1", "You prepare and submit", ["Same as any other type."]),
          step("2", "The People team reviews and approves", [
            "You'll be notified when that happens.",
          ]),
          step("3", "You have the conversation", [
            "In person, directly. This step is yours and the system can't do it for you.",
          ]),
          step("4", "Then you create the document", [
            "Under Review Existing Discussions, on the Active tab: Send Document, then Confirm.",
          ]),
        ],
      }),

      note(
        "Approval means the People team has signed off. It does not mean the team member has been told. Creating the document before that conversation notifies them before you've had the chance to."
      ),
    ],
  });

  // =========================================================================
  // Tab — Troubleshooting
  // =========================================================================

  /**
   * One disclosure entry.
   *
   * A single state path holds the open entry's id, so opening one closes the
   * rest — the catalog has no accordion, and this keeps the page short.
   */
  const faqItem = (id: string, question: string, lines: string[]) => {
    const open = equals($state("/faq/open"), id);
    return VStack({
      props: { gap: "space200" },
      children: [
        HStack({
          props: { gap: "space200", align: "center" },
          children: [
            Button({
              props: {
                appearance: "GHOST",
                label: $cond(open, "–", "+"),
                size: "S",
              },
              on: {
                // Clicking the open entry closes it.
                press: setState({
                  statePath: "/faq/open",
                  value: $cond(open, "", id),
                }),
              },
            }),
            Text({
              props: { text: question, typestyle: "typestyleBodyMedium600" },
            }),
          ],
        }),
        VStack({
          visible: open,
          props: { gap: "space200", padding: "space300" },
          children: lines.map((l) => body(l)),
        }),
        AtomsSeparator({ props: {} }),
      ],
    });
  };

  const troubleTab = VStack({
    visible: isTab("trouble"),
    props: { gap: "space300" },
    children: [
      Heading({ props: { level: 2, text: "FAQ" } }),
      lede("The handful of things that come up most."),

      faqItem("panel", "The team member panel is empty or still loading", [
        "Give it a few seconds — it pulls from several places. If it's still blank after that, click Start Over and select the person again.",
        "The action buttons stay disabled until the panel has filled in. That's deliberate: it stops you acting on information that isn't there yet.",
      ]),
      faqItem("slow", "Validation is taking a long time", [
        "If a save runs past about fifteen seconds, try it again. A long session can slow the page down; reloading the tab usually clears it.",
        `If it keeps happening, send the details to ${SUPPORT_CONTACT}.`,
      ]),
      faqItem("validate", "A section won't validate and I can't see why", [
        "The message under the section names the specific problem. The usual causes are text under 100 characters, more paragraphs than the section allows, or a single paragraph over the character limit.",
        "If you pasted the text in, retype a few words and try again.",
      ]),
      faqItem("wrong", "I picked the wrong type or reason", [
        "Before you click Begin New Discussion, use Reset Type, Reason, and/or Level.",
        "Afterwards those choices are written to the record and locked — cancel the discussion and start a new one instead.",
      ]),
      faqItem("self", "I need to record a discussion about myself", [
        "You can't. You won't appear in the team member search, and selecting yourself another way is blocked.",
        `If a discussion genuinely needs recording about you, contact ${SUPPORT_CONTACT}.`,
      ]),
      faqItem("both", "I want to edit one discussion while drafting another", [
        "You can. Each section has its own switch, so turning both on puts Create New Discussion and Review Existing Discussions in view at once.",
        "They keep separate state — work in one won't disturb the other.",
      ]),
      faqItem("down", "The app is down. How do I submit a discussion?", [
        `Email ${SUPPORT_CONTACT} with everything you would normally enter in the app — the type, the reason, the warning level if it's a warning, the dates, and the details. What each type needs is on the Plan a discussion tab.`,
        "Write the formal notice yourself. Normally Rippling generates it from what you enter; with the app down, that has to be a document you produce.",
        "Send both to People Operations, ask for approval if the discussion needs it, and copy us on whatever you send the team member. Rippling usually records that the document was delivered, so the CC is how we keep that trail.",
      ]),
    ],
  });

  // =========================================================================
  // Root
  // =========================================================================

  const root = VStack({
    props: { gap: "space500", padding: "space500", align: "stretch" },
    children: [
      HStack({
        props: { gap: "space500", align: "flex-start", justify: "space-between" },
        children: [
          VStack({
            props: { gap: "space200", grow: 1 },
            children: [
              Heading({ props: { level: 1, text: "Overview & Guidelines" } }),
              lede(
                "How to run a performance discussion at Capsule and how to record it in the Performance Dashboard."
              ),
            ],
          }),

          Box({
            props: {
              backgroundColor: "colorSurfaceContainer",
              padding: "space400",
              radius: "shapeCornerMd",
              basis: "280px",
              shrink: 0,
            },
            children: [
              VStack({
                props: { gap: "space200", align: "center" },
                children: [
                  Text({
                    props: {
                      text: "Need this reference open while you work?",
                      typestyle: "typestyleBodySmall600",
                      color: "colorPrimary",
                      align: "center", 
                    },
                  }),
                  Text({
                    props: {
                      text: "Click below to open the page in a new tab.", 
                      typestyle: "typestyleBodySmall600",
                      color: "colorOnSurfaceVariant",
                      align: "center", 
                    },
                  }),
                  Button({
                    props: {
                      appearance: "OUTLINE",
                      label: "Performance Discussion Actions",
                      size: "S",
                      isFluid: true,
                      to: { path: ACTIONS_PAGE_URL, openInNewTab: true },
                      tip: "Opens in a new tab"
                    },
                  }),
                ],
              }),
            ],
          }),
        ],
      }),

      Tab({
        props: {
          type: "LINK",
          items: [
            { title: "Before you start", value: "before" },
            { title: "Where things live", value: "where" },
            { title: "Who can do what", value: "access" },
            { title: "Plan a discussion", value: "plan" },
            { title: "Create a discussion", value: "create" },
            { title: "Review existing", value: "review" },
            { title: "Termination notices", value: "termination" },
            { title: "FAQ", value: "trouble" },
          ],
          value: { $bindState: "/nav/tab" },
        },
      }),

      beforeTab,
      whereTab,
      accessTab, 
      planTab,
      createTab,
      reviewTab,
      terminationTab,
      troubleTab,

      AtomsSeparator({ props: {} }),
      quiet(
        `Questions about a specific situation, or anything this guide doesn't cover — ${SUPPORT_CONTACT}.`
      ),
    ],
  });

  return render({ root, state: initialState });
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/**
 * Renders the manager guide.
 *
 * Read-only — every interaction is client-side state, so there are no server
 * round-trips after the initial load and no settings to configure.
 */
export async function onRipplingEvent(
  event: FunctionEvent,
  context: FunctionContext
): Promise<FunctionResponse> {
  const params = (event.parameters ?? {}) as Record<string, string | undefined>;

  if (params.action === "init") {
    return new FunctionResponse({
      body: { spec: JSON.stringify(buildSpec(context)) },
      statusCode: 200,
      headers: {},
      message: "",
    });
  }

  return new FunctionResponse({
    body: {},
    statusCode: 400,
    headers: {},
    message: "Unknown action",
  });
}
