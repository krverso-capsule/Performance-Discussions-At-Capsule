import { createSpec, equals, neq } from "@rippling/pebble-sdui-web";
import {
  AtomsSeparator,
  Box,
  Button,
  Card,
  Checkbox,
  Date as DateInput,
  EmployeeSearch,
  File as FileInput,
  HStack,
  Heading,
  Select,
  SnackBar, 
  Switch,
  Tab,
  Text,
  Textarea,
  VStack,
  navigate,
  render,
  setState,
  triggerFunction,
} from "@rippling/pebble-sdui-web/catalogs/custom-apps";
import {
  FunctionContext,
  FunctionEvent,
  FunctionResponse,
} from "@rippling/rippling-sdk";

const SUPPORT_CONTACT = "peopleops@capsule.com";
const API_BASE_URL = "https://rest.ripplingapis.com";
const PROFILE_URL = "https://app.rippling.com/profile/";
const RECORD_URL =
  "https://app.rippling.com/custom-apps/objects/disciplinary_action__c/";

/** The platform kills a function at 20s with no response body. */
const REQUEST_TIMEOUT_MS = 15000;
const PAGE_LIMIT = 100;
const MAX_PAGES = 8;
const PRIOR_MATTERS_LIMIT = 10;

const EMPTY = "-";
const NO_DATE = "0000-00-00";

const CREATE_ATTESTATION =
  "I confirm that the team member is not engaged in protected activity and that I am prepared to provide detailed information that is true and accurate.";

/** Termination notices are delivered after finalization, not on submit. */
const SUBMIT_ATTESTATION_TERMINATION =
  "I confirm that the team member is not engaged in protected activity and that the information detailed in this form is true and accurate. When this discussion is finalized, I will ensure the details of the discussion are communicated and/or delivered to the team member.";

const SUBMIT_ATTESTATION_STANDARD =
  "I confirm that the information detailed in this form is true and accurate, and the details of the discussion have been communicated and/or delivered to the team member.";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

type PriorMatterOption = { label: string; value: string };

type HistoryRow = {
  id: string;
  url: string;
  headline: string;
  detail: string;
  sentDetail: string;
  canSend: string; 
  showApprove: string; 
};

type DiscussionHistory = {
  inProgress: HistoryRow[];
  active: HistoryRow[];
  archived: HistoryRow[];
  canceled: HistoryRow[];
};

const emptyHistory: DiscussionHistory = {
  inProgress: [],
  active: [],
  archived: [],
  canceled: [],
};

type EmployeePanel = {
  name: string; 
  title: string;
  status: string;
  startDate: string;
  department: string;
  location: string;
  manager: string;
  activeCount: string;
  inProgressCount: string;
  archivedCount: string;
  canceledCount: string;
  mostRecentSubmitted: string;
  attendancePolicy: string;
  priorMattersOptions: PriorMatterOption[];
  history: DiscussionHistory;
  loaded: string;
  userMessage: string;
  canApprove: string;
};

type RecordHeader = {
  id: string;
  name: string;
  status: string;
  type: string;
  reason: string;
  warningLevel: string;
  warningType: string;
  dateBounds: DateBounds; 
  monitoringEndDate: string;
  finalizedDate: string;
  createdDate: string;
  communicationDate: string;
  createdById: string;
  createdByName: string;
  submittedById: string;
  submittedByName: string; 
  showFeedback: string;
  showIncident: string;
  showPriorMatters: string;
  showAddtlInfo: string;
  showActionPlan: string;
  isAbandonment: string;
};

type DetailsState = {
  feedbackDate: string;
  feedbackDetails: string;
  ncns1: string;
  ncns2: string;
  ncns3: string;
  incidentDate: string;
  incidentDetails: string;
  includePriorMatters: boolean;
  priorMattersSelected: string[];
  includeAddtlContext: boolean;
  addtlContext: string;
  includeActionPlan: boolean;
  actionPlan: string;
  includeComms: boolean;
  commDate: string;
  commMethod: string;
  /** File inputs store an array of file objects, not a string. */
  commRecording: unknown[];
  witness: string;
  commEmail: unknown[];
};

type CardResult = { error: string; saved: string };
type CardSet = {
  feedback: CardResult;
  incident: CardResult;
  priorMatters: CardResult;
  addtlInfo: CardResult;
  actionPlan: CardResult;
  comms: CardResult;
};

type SubmissionState = { 
  checked: boolean; 
  error: string; 
  result: string; 
  showSnack: boolean;
  showSnackError: boolean; 
};

type AppState = {
    ui: {
    showCreate: boolean;
    showReview: boolean;
    showCreateDetails: boolean; 
    showEditDetails: boolean; 

  };
  selection: { employeeRoleId: string };
  employee: EmployeePanel;
  /** The initial field group, before the record exists. */
  newDiscussion: {
    type: string;
    reason: string;
    warningLevel: string;
    attestationChecked: boolean;
  };
  /** Workspace A — the record created in this session. */
  created: RecordHeader;
  details: DetailsState;
  cards: CardSet;
  submission: SubmissionState;
  /** Workspace B — an existing record opened from Discussion History. */
  editing: RecordHeader;
  editDetails: DetailsState;
  editCards: CardSet;
  editSubmission: SubmissionState;
  history: { 
    tab: string; 
    message: string 
  };
  nav: { section: string };
  department: {
    options: DeptOption[];
    selected: string;
    timeframe: string;
    statuses: string[];
    rows: DeptRow[];
    message: string;
    hasOptions: string;
  };
};

const emptyPanel: EmployeePanel = {
  name: EMPTY, 
  title: EMPTY,
  status: EMPTY,
  startDate: EMPTY,
  department: EMPTY,
  location: EMPTY,
  manager: EMPTY,
  activeCount: EMPTY,
  inProgressCount: EMPTY,
  archivedCount: EMPTY,
  canceledCount: EMPTY,
  mostRecentSubmitted: EMPTY,
  attendancePolicy: EMPTY,
  priorMattersOptions: [],
  history: emptyHistory,
  loaded: "",
  userMessage: "",
  canApprove: "", 
};

type DateBounds = {
  feedbackMax: string;
  ncns1Max: string;
  ncns2Max: string;
  ncns3Max: string;
  incidentMax: string;
  commMax: string;
};

const emptyBounds: DateBounds = {
  feedbackMax: "",
  ncns1Max: "",
  ncns2Max: "",
  ncns3Max: "",
  incidentMax: "",
  commMax: "",
};

const emptyRecord: RecordHeader = {
  id: "",
  name: "",
  status: "",
  type: "",
  reason: "",
  warningLevel: "",
  warningType: "",
  dateBounds: emptyBounds, 
  monitoringEndDate: NO_DATE,
  finalizedDate: NO_DATE,
  createdDate: "",
  communicationDate: "",
  createdById: "",
  createdByName: "",
  submittedById: "",
  submittedByName: "",
  showFeedback: "",
  showIncident: "",
  showPriorMatters: "",
  showAddtlInfo: "",
  showActionPlan: "",
  isAbandonment: "",
};

const emptyCard: CardResult = { error: "", saved: "" };

const emptyCards: CardSet = {
  feedback: emptyCard,
  incident: emptyCard,
  priorMatters: emptyCard,
  addtlInfo: emptyCard,
  actionPlan: emptyCard,
  comms: emptyCard,
};

const emptySubmission: SubmissionState = {
  checked: false,
  error: "",
  result: "",
  showSnack: false, 
  showSnackError: false, 
};

const emptyDetails: DetailsState = {
  feedbackDate: "",
  feedbackDetails: "",
  ncns1: "",
  ncns2: "",
  ncns3: "",
  incidentDate: "",
  incidentDetails: "",
  includePriorMatters: false,
  priorMattersSelected: [],
  includeAddtlContext: false,
  addtlContext: "",
  includeActionPlan: false,
  actionPlan: "",
  includeComms: false,
  commDate: "",
  commMethod: "",
  commRecording: [],
  witness: "",
  commEmail: [],
};

const initialState: AppState = {
  ui: {
    showCreate: false,
    showReview: false,
    showCreateDetails: false,
    showEditDetails: false, 
  },
  selection: { employeeRoleId: "" },
  employee: emptyPanel,
  newDiscussion: {
    type: "",
    reason: "",
    warningLevel: "",
    attestationChecked: false,
  },
  created: emptyRecord,
  details: emptyDetails,
  cards: emptyCards,
  submission: emptySubmission,
  editing: emptyRecord,
  editDetails: emptyDetails,
  editCards: emptyCards,
  editSubmission: emptySubmission,
  history: { tab: "inProgress", message: "" },
  nav: { section: "/by-team-member" },
  department: {
    options: [],
    selected: "",
    timeframe: "1w",
    statuses: [],
    rows: [],
    message: "",
    hasOptions: "",
  },
};

type DeptOption = { label: string; value: string };

/** A history row plus the employee it belongs to. */
type DeptRow = HistoryRow & { employeeName: string };

const DEPT_PAGE_LIMIT = 100;

/** The department query traverses an edge field, so it runs slower than the rest. */
const DEPT_BUDGET_MS = 14000;
const DEPT_TIMEOUT_MS = 8000;

const TIMEFRAMES: Array<{ label: string; value: string; days: number }> = [
  { label: "Within the last week", value: "1w", days: 7 },
  { label: "Within the last 2 weeks", value: "2w", days: 14 },
  { label: "Within the last month", value: "1m", days: 30 },
  { label: "Within the last 3 months", value: "3m", days: 90 },
  { label: "Within the last 6 months", value: "6m", days: 180 },
];

const STATUSES = [
  "Draft",
  "Submitted",
  "Pending Approval",
  "Approved",
  "Finalized",
  "Sent Back",
  "Canceled",
];

// ---------------------------------------------------------------------------
// Permission controls
// ---------------------------------------------------------------------------

/** What the checker knows about each side. Both sides are already loaded. */
type Party = {
  roleId: string;
  department: string;
  parentDepartment: string;
  title: string;
};

/**
 * One access rule.
 *
 * `applies` decides whether the rule speaks to this viewer at all. When it
 * does, `grants` decides the target — and a rule that applies but does not
 * grant is not the end of it: the reporting line is checked afterwards, so a
 * lead with both a team and a department remit keeps both.
 */
type AccessRule = {
  name: string;
  applies: (viewer: Party) => boolean;
  /** Omitted means the rule grants everyone once it applies. */
  grants?: (target: Party) => boolean;
};

const hasTitle = (p: Party, word: string) =>
  p.title.toLowerCase().includes(word.toLowerCase());

const inDepartment = (p: Party, parent: string, name: string) =>
  p.parentDepartment === parent && p.department === name;

const ACCESS_RULES: AccessRule[] = [
  {
    name: "People Operations",
    applies: (v) => v.department === "People Operations",
    // No `grants` — People Ops opens a discussion about anyone.
  },
  {
    name: "Senior Dispatch to Couriers",
    applies: (v) => (v.department === "Logistics") && hasTitle(v, "Manager"),
    grants: (t) => inDepartment(t, "Logistics", "Courier"),
  },
  {
    name: "Logistics Managers", 
    applies: (v) => inDepartment(v, "Logistics", "Dispatch") && hasTitle(v, "Senior"),
  }
];

/** How far down the reporting line a manager can reach. */
const MAX_MANAGER_HOPS = 4;

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

function buildSpec(context: FunctionContext) {
  const { $state, $cond, $template, repeat } = createSpec<AppState>({
    state: initialState,
  });
  const functionApiName = context.function.function_api_name;

  /** The viewer's own role id, used to keep them out of their own results. */
  const currentRoleId = String((context as any)?.function?.role_id ?? "");

  /**
   * Wraps a condition so the prop receives a real boolean rather than a
   * condition object. Condition helpers are documented for `visible`; binding
   * them straight to `isDisabled` does not work.
   */
  const disabledWhen = (c: unknown) => $cond(c, true, false);
  const isEmpty = (p: string) => equals($state(p), "");
  const isSet = (p: string) => neq($state(p), "");
  const isOn = (p: string) => equals($state(p), true);
  const isOff = (p: string) => neq($state(p), true);

  // -- Text helpers --------------------------------------------------------

  const para = (text: string, bold = false) =>
    Text({
      props: {
        text,
        typestyle: bold ? "typestyleBodyMedium600" : "typestyleBodyMedium",
      },
    });

  const sectionLabel = (text: string) =>
    Text({ props: { text, typestyle: "typestyleBodyMedium600" } });

  const bullet = (text: string, level = 0) =>
    HStack({
      props: { gap: "space200", align: "flex-start", wrap: "nowrap" },
      children: [
        Box({
          props: { width: level === 0 ? "20px" : "44px", shrink: 0 },
          children: [
            Text({
              props: {
                text: level === 0 ? "•" : "◦",
                typestyle: "typestyleBodyMedium",
                align: "right",
              },
            }),
          ],
        }),
        Text({ props: { text, typestyle: "typestyleBodyMedium", grow: 1 } }),
      ],
    });

  const staticBlock = (title: string, children: unknown[]) =>
    VStack({
      props: { gap: "space300" },
      children: [
        Text({
          props: {
            text: title,
            typestyle: "typestyleBodySmall",
            color: "colorOnSurfaceVariant",
          },
        }),
        Box({
          props: {
            backgroundColor: "colorSurfaceContainer",
            padding: "space400",
            radius: "shapeCornerMd",
          },
          children: [VStack({ props: { gap: "space300" }, children })],
        }),
      ],
    });

  const normalText = (text: string) =>
    Text({
      props: {
        text,
        typestyle: "typestyleBodyMedium",
        color: "colorOnSurfaceVariant",
      },
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
            ...lines.map((l) => normalText(l)),
          ],
        }),
      ],
    });

  /**
   * Field labels above a component.
   *
   * File and EmployeeSearch accept a `label` prop but do not render it, so
   * every labelled input in this page gets its own Text rather than relying on
   * the component.
   */
  const labelled = (label: string, child: unknown) =>
    VStack({
      props: { gap: "space050" },
      children: [
        Text({ props: { text: label, typestyle: "typestyleBodySmall600" } }),
        child,
      ],
    });

  const field = (label: string, statePath: string) =>
    VStack({
      props: { gap: "space050" },
      children: [
        Text({
          props: {
            text: label,
            typestyle: "typestyleBodySmall600",
            color: "colorOnSurfaceVariant",
          },
        }),
        Text({
          props: { text: $state(statePath), typestyle: "typestyleBodyMedium" },
        }),
      ],
    });

  const column = (fields: Array<[string, string]>) =>
    VStack({
      props: { gap: "space400", grow: 1, basis: "0" },
      children: fields.map(([l, p]) => field(l, p)),
    });

  // -- Static text ---------------------------------------------------------

  const terminationStaticText = () =>
    staticBlock("Summary Static Text", [
      para(
        "This memo serves as formal notification that your employment with Capsule is terminated, effective immediately.",
        true
      ),
      para(
        "This decision has been reached following a review of your performance and/or conduct and its alignment with the requirements of your role."
      ),
      para(
        "We appreciate the contributions you have made during your time with us and wish you the best in your future endeavors."
      ),
      sectionLabel("Offboarding Information"),
      sectionLabel("Final Pay"),
      bullet(
        "You will receive your final paycheck in accordance with company policy and relevant state laws."
      ),
      sectionLabel("Benefits"),
      bullet(
        "If you are enrolled in Capsule health benefits, your medical, dental, and vision benefits will remain active through the end of this month."
      ),
      bullet(
        "On the 1st of the following month, you will be eligible to receive COBRA benefits should you choose to enroll. You will receive a COBRA notice in the mail, using the address that we have on file in Rippling."
      ),
      sectionLabel("Equipment"),
      bullet(
        "If you have a Capsule issued laptop you can retain it for personal use if it is greater than 2 years old. In that case:"
      ),
      bullet(
        "MacBook: IT will reset the machine remotely and notify you when this is complete.",
        1
      ),
      bullet(
        "Windows: IT will need to work with you to reset the laptop as it cannot be done completely remotely. Please submit a ticket to our IT team at support@capsule.com to get started.",
        1
      ),
      bullet(
        "Otherwise, IT will reach out to you directly regarding your device return."
      ),
      sectionLabel("Rippling"),
      bullet(
        "To ensure you receive all important documents and notices, please record any changes to address or contact information in Rippling as soon as possible."
      ),
      bullet(
        "You will continue to have access to your Rippling profile, where you can access pay stubs and any forms needed for tax filing purposes."
      ),
    ]);

  const actionPlanStaticText = (typePath: string) =>
    staticBlock("Action Plan Static Text", [
      Text({
        props: {
          text: $cond(
            equals($state(typePath), "Warning"),
            "This warning details the areas of performance and behavior that require immediate improvement to meet your position's expectations and continue employment with Capsule.",
            "This memo summarizes our recent conversation regarding your contributions and conduct at Capsule. It's meant to provide clarity on expectations and next steps moving forward."
          ),
          typestyle: "typestyleBodyMedium600",
        },
      }),
      para(
        "To ensure we continue providing strong service to our customers and working well together as a team, all team members are expected to follow company policies and maintain professional standards. As a reminder, as a team member, you are expected to:"
      ),
      bullet("Adhere to all company-wide policies and procedures"),
      bullet(
        "Interact and engage in a professional manner at all times when dealing with customers, managers, team members, and vendors"
      ),
      bullet(
        "Exemplify and support Capsule's values of Looking After and Winning Together in all interactions"
      ),
      para(
        "The observations in this notice are intended to support growth by outlining opportunities where behavior and/or performance expectations are not currently being met, thus impacting your ability—and the team's ability—to do their best work."
      ),
      Text({
        visible: equals($state(typePath), "Warning"),
        props: {
          text: "The Warning Level and Monitoring Period are specified above, and the warning will be in effect for the number of days noted in the monitoring period.",
          typestyle: "typestyleBodyMedium600",
        },
      }),
      para(
        "This notice serves as a constructive step toward improvement. It's important that you understand how your actions impact our customers, your team members, and the overall business. We expect immediate and sustained improvement in your performance and/or conduct, in full alignment with company expectations and policies. If these expectations are not met, further disciplinary action will be taken, up to and including termination of employment."
      ),
      para(
        "We want to see you do your best work here at Capsule. We are fully committed to supporting you through this process by providing the coaching, tools, and open communication you need to succeed and meet these standards."
      ),
    ]);

  /**
   * Builds a complete Discussion Details card against a set of state roots.
   *
   * Two instances exist at once — one for the record created in this session,
   * one for a record opened from history — so a manager can draft a new
   * discussion and revise an existing one side by side. Every path the card
   * touches is namespaced, so the two never share state.
   */
  const discussionDetailsCard = (ns: {
    record: string;
    details: string;
    cards: string;
    submission: string;
    openPath: string; 
    /**
     * Actions appended to the Submit button's press array. They fire alongside
     * the request rather than after it, since onSuccess does not work here.
     */
    afterSubmit?: unknown[];
  }) => {
    const hasRecord = isSet(`${ns.record}/id`);
    const isTermination = equals(
      $state(`${ns.record}/type`),
      "Termination Notice"
    );

    const showFeedback = equals($state(`${ns.record}/showFeedback`), "yes");
    const showIncident = equals($state(`${ns.record}/showIncident`), "yes");
    const showPriorMatters = equals($state(`${ns.record}/showPriorMatters`), "yes");
    const showAddtlInfo = equals($state(`${ns.record}/showAddtlInfo`), "yes");
    const showActionPlan = equals($state(`${ns.record}/showActionPlan`), "yes");
    const isAbandonment = equals($state(`${ns.record}/isAbandonment`), "yes");

    const lockedWhenSaved = (key: string) =>
      disabledWhen(isSet(`${ns.cards}/${key}/saved`));

    /**
     * The Validate & Save / Edit pair every card shares. Save shows while the
     * card is unsaved; Edit replaces it and clears `saved`, re-enabling the
     * fields. Swapping on `visible` means only one is ever live.
     */
    const cardActions = (key: string, saveInputs: Record<string, unknown>) =>
      VStack({
        props: { gap: "space200" },
        children: [
          Text({
            visible: isSet(`${ns.cards}/${key}/error`),
            props: {
              text: $state(`${ns.cards}/${key}/error`),
              typestyle: "typestyleBodySmall",
              color: "colorError",
            },
          }),
          HStack({
            props: { gap: "space200", justify: "flex-end", align: "center" },
            children: [
              Text({
                visible: isSet(`${ns.cards}/${key}/saved`),
                props: {
                  text: "Saved",
                  typestyle: "typestyleBodySmall",
                  color: "colorOnSurfaceVariant",
                },
              }),
              Button({
                visible: isSet(`${ns.cards}/${key}/saved`),
                props: { appearance: "OUTLINE", label: "Edit" },
                on: {
                  press: setState({
                    statePath: `${ns.cards}/${key}/saved`,
                    value: "",
                  }),
                },
              }),
              Button({
                visible: isEmpty(`${ns.cards}/${key}/saved`),
                props: { appearance: "PRIMARY", label: "Validate & Save" },
                on: {
                  press: triggerFunction({
                    functionApiName,
                    inputs: saveInputs,
                    responsePath: `${ns.cards}/${key}`,
                  }),
                },
              }),
            ],
          }),
        ],
      });

    const discussionDetailsHeader = VStack({
      props: { gap: "space300" },
      children: [
        HStack({
          props: { justify: "space-between", align: "center" },
          children: [
            Heading({ props: { level: 3, text: "Discussion Details" } }),
            Button({
              props: { appearance: "GHOST", label: "Close", size: "S" },
              on: {
                // Hides the card without discarding the record — reopen from
                // Review Existing Discussions.
                press: setState({ statePath: ns.openPath, value: false }),
              },
            }),
          ],
        }),
        HStack({
          props: { gap: "space500", align: "flex-start", wrap: "wrap" },
          children: [
            field("Discussion", `${ns.record}/name`),
            VStack({
              props: { gap: "space050" },
              children: [
                Text({
                  props: {
                    text: "Type",
                    typestyle: "typestyleBodySmall600",
                    color: "colorOnSurfaceVariant",
                  },
                }),
                Text({
                  props: {
                    // Level and derived type only exist on warnings.
                    text: $cond(
                      isEmpty(`${ns.record}/warningLevel`),
                      $state(`${ns.record}/type`),
                      $template`${$state(`${ns.record}/type`)} > ${$state(
                        `${ns.record}/warningLevel`
                      )} > ${$state(`${ns.record}/warningType`)}`
                    ),
                    typestyle: "typestyleBodyMedium",
                  },
                }),
              ],
            }),
            field("Reason", `${ns.record}/reason`),
            field("Status", `${ns.record}/status`),
            field("Finalized on", `${ns.record}/finalizedDate`),
            field("Monitoring ends on", `${ns.record}/monitoringEndDate`),
          ],
        }),
        AtomsSeparator({ props: {} }),
      ],
    });

    const feedbackCard = Card({
      visible: showFeedback,
      props: { title: "Feedback Details" },
      children: [
        VStack({
          props: { gap: "space400" },
          children: [
            DateInput({
              props: {
                label: "Date of Feedback",
                format: "yyyy-MM-dd",
                isPickerVisible: true, 
                shouldLocalize: true, 
                shouldShowTime: false, 
                shouldShowTimezoneLabel: false, 
                alwaysShowTimezone: false, 
                canClear: true,
                isRequired: true,
                maxDate: $state(`${ns.record}/dateBounds/feedbackMax`),
                isDisabled: lockedWhenSaved("feedback"),
                value: { $bindState: `${ns.details}/feedbackDate` },
              },
            }),
            Textarea({
              props: {
                label: "Feedback Details",
                placeholder:
                  "At least 100 characters. Up to 9 paragraphs, each under 1000 characters.",
                height: 180,
                isRequired: true,
                isDisabled: lockedWhenSaved("feedback"),
                value: { $bindState: `${ns.details}/feedbackDetails` },
              },
            }),
            cardActions("feedback", {
              action: "saveFeedback",
              recordId: $state(`${ns.record}/id`),
              createdDate: $state(`${ns.record}/createdDate`),
              communicationDate: $state(`${ns.record}/communicationDate`),
              feedbackDate: $state(`${ns.details}/feedbackDate`),
              feedbackDetails: $state(`${ns.details}/feedbackDetails`),
            }),
          ],
        }),
      ],
    });

    const incidentCard = Card({
      visible: showIncident,
      props: { title: "Incident Details" },
      children: [
        VStack({
          props: { gap: "space400" },
          children: [
            // The three NCNS dates only apply to Job Abandonment.
            HStack({
              visible: isAbandonment,
              props: { gap: "space400", wrap: "wrap" },
              children: [
                DateInput({
                  props: {
                    label: "NCNS - Date 1",
                    format: "yyyy-MM-dd",
                    isPickerVisible: true, 
                    shouldLocalize: true, 
                    shouldShowTime: false, 
                    shouldShowTimezoneLabel: false, 
                    alwaysShowTimezone: false, 
                    canClear: true,
                    isRequired: true,
                    maxDate: $state(`${ns.record}/dateBounds/ncns1Max`),
                    isDisabled: lockedWhenSaved("incident"),
                    value: { $bindState: `${ns.details}/ncns1` },
                  },
                }),
                DateInput({
                  props: {
                    label: "NCNS - Date 2",
                    format: "yyyy-MM-dd",
                    isPickerVisible: true, 
                    shouldLocalize: true, 
                    shouldShowTime: false, 
                    shouldShowTimezoneLabel: false, 
                    alwaysShowTimezone: false, 
                    canClear: true,
                    isRequired: true,
                    maxDate: $state(`${ns.record}/dateBounds/ncns2Max`),
                    isDisabled: lockedWhenSaved("incident"),
                    value: { $bindState: `${ns.details}/ncns2` },
                  },
                }),
                DateInput({
                  props: {
                    label: "NCNS - Date 3",
                    format: "yyyy-MM-dd",
                    isPickerVisible: true, 
                    shouldLocalize: true, 
                    shouldShowTime: false, 
                    shouldShowTimezoneLabel: false, 
                    alwaysShowTimezone: false, 
                    canClear: true,
                    isRequired: true,
                    maxDate: $state(`${ns.record}/dateBounds/ncns3Max`),
                    isDisabled: lockedWhenSaved("incident"),
                    value: { $bindState: `${ns.details}/ncns3` },
                  },
                }),
              ],
            }),

            DateInput({
              visible: equals($state(`${ns.record}/isAbandonment`), ""),
              props: {
                label: "Date of Incident",
                format: "yyyy-MM-dd",
                isPickerVisible: true, 
                shouldLocalize: true, 
                shouldShowTime: false, 
                shouldShowTimezoneLabel: false, 
                alwaysShowTimezone: false, 
                canClear: true,
                isRequired: true,
                maxDate: $state(`${ns.record}/dateBounds/incidentMax`),
                isDisabled: lockedWhenSaved("incident"),
                value: { $bindState: `${ns.details}/incidentDate` },
              },
            }),

            // Read-only echo — the third NCNS date becomes the incident date.
            VStack({
              visible: isAbandonment,
              props: { gap: "space050" },
              children: [
                Text({
                  props: {
                    text: "Date of Incident",
                    typestyle: "typestyleBodySmall600",
                    color: "colorOnSurfaceVariant",
                  },
                }),
                Text({
                  props: {
                    text: $cond(
                      isEmpty(`${ns.details}/ncns3`),
                      "Set from NCNS - Date 3",
                      $state(`${ns.details}/ncns3`)
                    ),
                    typestyle: "typestyleBodyMedium",
                  },
                }),
              ],
            }),

            Textarea({
              props: {
                label: "Incident Details",
                placeholder:
                  "At least 100 characters. Up to 9 paragraphs, each under 2000 characters.",
                height: 180,
                isDisabled: lockedWhenSaved("incident"),
                value: { $bindState: `${ns.details}/incidentDetails` },
              },
            }),

            cardActions("incident", {
              action: "saveIncident",
              recordId: $state(`${ns.record}/id`),
              type: $state(`${ns.record}/type`),
              reason: $state(`${ns.record}/reason`),
              createdDate: $state(`${ns.record}/createdDate`),
              communicationDate: $state(`${ns.record}/communicationDate`),
              ncns1: $state(`${ns.details}/ncns1`),
              ncns2: $state(`${ns.details}/ncns2`),
              ncns3: $state(`${ns.details}/ncns3`),
              incidentDate: $state(`${ns.details}/incidentDate`),
              incidentDetails: $state(`${ns.details}/incidentDetails`),
            }),
          ],
        }),
      ],
    });

    const priorMattersCard = Card({
      visible: showPriorMatters,
      props: { title: "Prior Matters" },
      children: [
        VStack({
          props: { gap: "space400" },
          children: [
            normalText(
              "Review the list of active discussions. Choose any or all records that should be included as prior matters. Selected records will be listed under the incident that is the main topic of this discussion."
            ),

            HStack({
              props: { gap: "space300", align: "center" },
              children: [
                Switch({
                  props: {
                    isDisabled: lockedWhenSaved("priorMatters"),
                    value: { $bindState: `${ns.details}/includePriorMatters` },
                  },
                }),
                Text({
                  props: {
                    text: "Include Prior Matters",
                    typestyle: "typestyleBodyMedium600",
                  },
                }),
              ],
            }),

            // Each option's value IS its formatted label, so the selection
            // arrives ready to store — no second lookup to turn IDs back into
            // readable lines.
            Select({
              props: {
                label: "Select prior matters",
                placeholder: "Select",
                isMulti: true,
                canSelectAll: true,
                isRequired: isOn(`${ns.details}/includePriorMatters`),
                isDisabled: $cond(
                  isOff(`${ns.details}/includePriorMatters`),
                  true,
                  lockedWhenSaved("priorMatters")
                ),
                list: { $bindState: "/employee/priorMattersOptions" },
                value: { $bindState: `${ns.details}/priorMattersSelected` },
              },
            }),

            cardActions("priorMatters", {
              action: "savePriorMatters",
              recordId: $state(`${ns.record}/id`),
              include: $state(`${ns.details}/includePriorMatters`),
              selected: $state(`${ns.details}/priorMattersSelected`),
            }),
          ],
        }),
      ],
    });

    const addtlInfoCard = Card({
      visible: showAddtlInfo,
      props: { title: "Additional Information" },
      children: [
        VStack({
          props: { gap: "space400" },
          children: [
            normalText(
              "Each Termination Notice will include a summary of the decision to terminate employment. The Termination Notice Summary Static Text will always be included. Optionally, you may select any history of prior matters (above, if available) and/or add any additional information or context to be included as a paragraph prior to the static text."
            ),
            terminationStaticText(),
            HStack({
              props: { gap: "space300", align: "center" },
              children: [
                Switch({
                  props: {
                    isDisabled: lockedWhenSaved("addtlInfo"),
                    value: { $bindState: `${ns.details}/includeAddtlContext` },
                  },
                }),
                Text({
                  props: {
                    text: "Include Additional Context",
                    typestyle: "typestyleBodyMedium600",
                  },
                }),
              ],
            }),
            Textarea({
              props: {
                label: "Additional Context",
                placeholder:
                  "At least 100 characters. Up to 6 paragraphs, each under 1000 characters.",
                height: 160,
                isRequired: isOn(`${ns.details}/includeAddtlContext`),
                isDisabled: $cond(
                  isOff(`${ns.details}/includeAddtlContext`),
                  true,
                  lockedWhenSaved("addtlInfo")
                ),
                value: { $bindState: `${ns.details}/addtlContext` },
              },
            }),
            cardActions("addtlInfo", {
              action: "saveAddtlInfo",
              recordId: $state(`${ns.record}/id`),
              include: $state(`${ns.details}/includeAddtlContext`),
              addtlContext: $state(`${ns.details}/addtlContext`),
            }),
          ],
        }),
      ],
    });

    const actionPlanCard = Card({
      // Hidden for Positive Feedback and for Termination Notices — an action
      // plan has no place in either.
      visible: showActionPlan,
      props: { title: "Action Plan" },
      children: [
        VStack({
          props: { gap: "space400" },
          children: [
            normalText(
              "Constructive discussions include a section for Expectations and Action Plan, concluding with the static text below. Optionally, you may add any specific information to be included before the static text."
            ),
            actionPlanStaticText(`${ns.record}/type`),
            HStack({
              props: { gap: "space300", align: "center" },
              children: [
                Switch({
                  props: {
                    isDisabled: lockedWhenSaved("actionPlan"),
                    value: { $bindState: `${ns.details}/includeActionPlan` },
                  },
                }),
                Text({
                  props: {
                    text: "Add to Action Plan",
                    typestyle: "typestyleBodyMedium600",
                  },
                }),
              ],
            }),
            Textarea({
              props: {
                label: "Action Plan",
                placeholder:
                  "At least 100 characters. Up to 6 paragraphs, each under 1000 characters.",
                height: 160,
                isRequired: isOn(`${ns.details}/includeActionPlan`),
                isDisabled: $cond(
                  isOff(`${ns.details}/includeActionPlan`),
                  true,
                  lockedWhenSaved("actionPlan")
                ),
                value: { $bindState: `${ns.details}/actionPlan` },
              },
            }),
            cardActions("actionPlan", {
              action: "saveActionPlan",
              recordId: $state(`${ns.record}/id`),
              include: $state(`${ns.details}/includeActionPlan`),
              actionPlan: $state(`${ns.details}/actionPlan`),
            }),
          ],
        }),
      ],
    });

    const commsDisabled = $cond(
      isOff(`${ns.details}/includeComms`),
      true,
      lockedWhenSaved("comms")
    );

    const commsCard = Card({
      props: { title: "Proof of Communication" },
      children: [
        VStack({
          props: { gap: "space400" },
          children: [
            normalText(
              "Based on the Discussion Type and Reason and/or Communication Method selected, additional details or attachments may be required."
            ),
            HStack({
              props: { gap: "space300", align: "center" },
              children: [
                Switch({
                  props: {
                    isDisabled: lockedWhenSaved("comms"),
                    value: { $bindState: `${ns.details}/includeComms` },
                  },
                }),
                Text({
                  props: {
                    text: "Include proof of communication",
                    typestyle: "typestyleBodyMedium600",
                  },
                }),
              ],
            }),
            HStack({
              props: { gap: "space400", wrap: "wrap", align: "flex-start" },
              children: [
                DateInput({
                  props: {
                    label: "Communication Date",
                    format: "yyyy-MM-dd",
                    isPickerVisible: true, 
                    shouldLocalize: true, 
                    shouldShowTime: false, 
                    shouldShowTimezoneLabel: false, 
                    alwaysShowTimezone: false, 
                    canClear: true,
                    maxDate: $state(`${ns.record}/dateBounds/commMax`),
                    isDisabled: commsDisabled,
                    value: { $bindState: `${ns.details}/commDate` },
                  },
                }),
                Select({
                  props: {
                    label: "Communication Method",
                    placeholder: "Select",
                    isDisabled: commsDisabled,
                    list: [
                      { label: "In-Person", value: "In-Person" },
                      { label: "Phone Call", value: "Phone Call" },
                      { label: "Virtual Meeting", value: "Virtual Meeting" },
                      { label: "Voice Mail", value: "Voice Mail" },
                      { label: "Email", value: "Email" },
                    ],
                    value: { $bindState: `${ns.details}/commMethod` },
                  },
                }),
              ],
            }),

            labelled(
              "Communication Recording",
              FileInput({
                props: {
                  placeholder: "Click to browse files",
                  // Required for Phone Call and Voice Mail — enforced on save.
                  supportTypes: [".mp3", ".m4a", ".wav", ".pdf", ".png", ".jpg"],
                  maxFileSize: 25,
                  isDisabled: commsDisabled,
                  value: { $bindState: `${ns.details}/commRecording` },
                },
              })
            ),

            labelled(
              "Witness",
              EmployeeSearch({
                props: {
                  placeholder: "Search for a team member",
                  roleTypes: ["ACTIVE"],
                  canClear: true,
                  // Filters the manager out of their own results; the check in
                  // loadEmployee stays as a backstop.
                  roleIdsToExclude: currentRoleId ? [currentRoleId] : undefined,
                  isDisabled: commsDisabled,
                  value: { $bindState: `${ns.details}/witness` },
                },
              })
            ),

            labelled(
              "Communication Email",
              FileInput({
                props: {
                  placeholder: "Click to browse files",
                  supportTypes: [".pdf", ".eml", ".msg", ".png", ".jpg"],
                  maxFileSize: 25,
                  isDisabled: commsDisabled,
                  value: { $bindState: `${ns.details}/commEmail` },
                },
              })
            ),

            cardActions("comms", {
              action: "saveComms",
              recordId: $state(`${ns.record}/id`),
              createdDate: $state(`${ns.record}/createdDate`),
              include: $state(`${ns.details}/includeComms`),
              commDate: $state(`${ns.details}/commDate`),
              commMethod: $state(`${ns.details}/commMethod`),
              commRecording: $state(`${ns.details}/commRecording`),
              witness: $state(`${ns.details}/witness`),
              commEmail: $state(`${ns.details}/commEmail`),
            }),
          ],
        }),
      ],
    });

    const submission = VStack({
      props: { gap: "space400" },
      children: [
        AtomsSeparator({ props: {} }),
        Heading({ props: { level: 3, text: "Submission Attestation" } }),
        Checkbox({
          props: {
            // Termination notices are delivered after finalization, so the
            // wording commits to future delivery rather than past.
            label: $cond(
              isTermination,
              SUBMIT_ATTESTATION_TERMINATION,
              SUBMIT_ATTESTATION_STANDARD
            ),
            value: { $bindState: `${ns.submission}/checked` },
          },
        }),
        HStack({
          props: { gap: "space200", justify: "flex-end" },
          children: [
            Button({
              props: {
                appearance: "PRIMARY",
                label: "Submit",
                isDisabled: $cond(
                  equals($state(`${ns.submission}/result`), "Submitted for approval."),
                  true,
                  $cond(isOff(`${ns.submission}/checked`), true, false)
                ),
              },
              on: {
                press: [
                  triggerFunction({
                    functionApiName,
                    inputs: {
                      action: "submitDiscussion",
                      recordId: $state(`${ns.record}/id`),
                      type: $state(`${ns.record}/type`),
                      warningLevel: $state(`${ns.record}/warningLevel`),
                      submit: true,
                    },
                    responsePath: ns.submission,
                  }),
                  ...(ns.afterSubmit ?? []), 
                ]
              },
            }),
            Button({
              props: {
                appearance: "OUTLINE",
                label: "Save",
                isDisabled: $cond(
                  equals($state(`${ns.submission}/result`), "Submitted for approval."),
                  true,
                  $cond(isOff(`${ns.submission}/checked`), true, false)
                ),
              },
              on: {
                press: triggerFunction({
                  functionApiName,
                  inputs: {
                    action: "saveDiscussion",
                    recordId: $state(`${ns.record}/id`),
                    type: $state(`${ns.record}/type`),
                    warningLevel: $state(`${ns.record}/warningLevel`),
                  },
                  responsePath: ns.submission,
                }),
              },
            }),
          ],
        }),
        HStack({
          props: { gap: "space200", justify: "flex-end" },
          children: [
            Text({
              visible: isSet(`${ns.submission}/error`),
              props: {
                text: $state(`${ns.submission}/error`),
                typestyle: "typestyleBodySmall",
                color: "colorError",
              },
            }),
            Text({
              visible: isSet(`${ns.submission}/result`),
              props: {
                text: $state(`${ns.submission}/result`),
                typestyle: "typestyleBodySmall",
                color: "colorOnSurfaceVariant",
              },
            }),
          ]
        }), 
      ],
    });

    return Card({
      visible: isOn(ns.openPath),
      //props: { title: "Discussion Details" },
      props: { padding: 16 }, 
      children: [
        VStack({
          props: { gap: "space500" },
          children: [
            discussionDetailsHeader,
            feedbackCard,
            incidentCard,
            priorMattersCard,
            addtlInfoCard,
            actionPlanCard,
            commsCard,
            submission,
          ],
        }),
      ],
    });
  };

  // -- Left: selection and instructions ------------------------------------
  const selectionColumn = VStack({
    props: { gap: "space400", padding: { bottom: "space400" }, basis: "460px", shrink: 0 },
    children: [
      EmployeeSearch({
        props: {
          placeholder: "Search for a team member",
          roleTypes: ["ACTIVE"],
          canClear: true,
          // Filters the manager out of their own results; the check in
          // loadEmployee stays as a backstop.
          roleIdsToExclude: currentRoleId ? [currentRoleId] : undefined,
          value: { $bindState: "/selection/employeeRoleId" },
        },
      }),

      HStack({
        props: { gap: "space200" },
        children: [
          Button({
            props: {
              appearance: "WARNING",
              label: "Start Over",
              isFluid: true,
              isDisabled: disabledWhen(isEmpty("/selection/employeeRoleId")),
            },
            on: {
              press: [
                setState({ statePath: "/selection/employeeRoleId", value: "" }),
                setState({ statePath: "/employee", value: emptyPanel }),
                setState({
                  statePath: "/ui",
                  value: {
                    showCreate: false,
                    showReview: false,
                    showCreateDetails: false,
                    showEditDetails: false, 
                  },
                }),
                setState({
                  statePath: "/newDiscussion",
                  value: {
                    type: "",
                    reason: "",
                    warningLevel: "",
                    attestationChecked: false,
                  },
                }),
                setState({ statePath: "/created", value: emptyRecord }),
                setState({ statePath: "/details", value: emptyDetails }),
                setState({ statePath: "/cards", value: emptyCards }),
                setState({ statePath: "/submission", value: emptySubmission }),
                setState({ statePath: "/editing", value: emptyRecord }),
                setState({ statePath: "/editDetails", value: emptyDetails }),
                setState({ statePath: "/editCards", value: emptyCards }),
                setState({
                  statePath: "/editSubmission",
                  value: emptySubmission,
                }),
                setState({
                  statePath: "/history",
                  value: { tab: "inProgress", message: "" },
                }),
              ],
            },
          }),
          Button({
            props: {
              appearance: "OUTLINE",
              label: "Select",
              isFluid: true,
              isDisabled: disabledWhen(isEmpty("/selection/employeeRoleId")),
            },
            on: {
              press: triggerFunction({
                functionApiName,
                inputs: {
                  action: "loadEmployee",
                  empId: $state("/selection/employeeRoleId"),
                },
                responsePath: "/employee",
              }),
            },
          }),
        ],
      }),

      VStack({
        props: { gap: "space300" },
        children: [
          step("1", "Select the team member", [
            "Use the search field at the top of Performance Discussion Actions to find the person this discussion concerns.",
          ]),
          step("2", "Confirm their information", [
            "Title, department, manager, work location, start date, and discussion counts appear in the right-hand panel. Give it a quick check — if anything's wrong, fix it on their profile first.",
            "The panel takes a moment to populate. Wait for it before choosing an action.",
          ]),
          step("3", "Choose an action", [
            "Create a new discussion, or review existing ones. Opening one section hides the other. Each has a switch in case you need to hide the section from view.",
          ]),
        ],
      }),

      HStack({
        props: { gap: "space200" },
        children: [
          Button({
            props: {
              appearance: $cond(isOn("/ui/showCreate"), "INFO", "OUTLINE"),
              label: "Create New Discussion",
              isFluid: true,
              isDisabled: disabledWhen(isEmpty("/employee/loaded")),
            },
            on: {
              // Hides the other section, so the page opens on one task at a
              // time. Either switch brings the hidden one back without losing
              // anything in it.
              press: [
                setState({ statePath: "/ui/showCreate", value: true }),
                setState({ statePath: "/ui/showReview", value: false }),
              ],
            },
          }),
          Button({
            props: {
              appearance: $cond(isOn("/ui/showReview"), "INFO", "OUTLINE"),
              label: "Review Existing Discussions",
              isFluid: true,
              isDisabled: disabledWhen(isEmpty("/employee/loaded")),
            },
            on: {
              // Hides the other section, so the page opens on one task at a
              // time. Either switch brings the hidden one back without losing
              // anything in it.
              press: [
                setState({ statePath: "/ui/showReview", value: true }),
                setState({ statePath: "/ui/showCreate", value: false }),
              ],
            },
          }),
        ],
      }),
    ],
  });

  // -- Right: team member info ---------------------------------------------
  const infoColumn = VStack({
    props: { gap: "space400", grow: 1 },
    children: [
      Heading({ props: { level: 3, text: "Team Member Info" } }),
      Text({
        props: {
          text: "Confirm that team member information is correct before selecting an action.",
          typestyle: "typestyleBodyMedium",
        },
      }),
      Box({
        props: {
          backgroundColor: "colorSurface",
          border: "1px solid var(--color-outline)",
          radius: "shapeCornerMd",
          padding: "space400",
        },
        children: [
          HStack({
            props: { gap: "space500", align: "flex-start", justify: "space-evenly" },
            children: [
              column([
                ["Name", "/employee/name"], 
                ["Title", "/employee/title"],
                ["Status", "/employee/status"],
                ["Start Date", "/employee/startDate"],
              ]),
              column([
                ["Department", "/employee/department"],
                ["Location", "/employee/location"],
                ["Manager", "/employee/manager"],
              ]),
              column([
                ["Active Discussions", "/employee/activeCount"],
                ["In Progress Discussions", "/employee/inProgressCount"],
                ["Most Recent Submitted", "/employee/mostRecentSubmitted"],
              ]),
              column([["Attendance Policy", "/employee/attendancePolicy"]]),
            ],
          }),
        ],
      }),
      Text({
        visible: isSet("/employee/userMessage"),
        props: {
          text: $state("/employee/userMessage"),
          typestyle: "typestyleBodySmall",
          color: "colorError",
        },
      }),
      HStack({
        props: { gap: "space200", justify: "flex-end" },
        children: [
          Button({
            props: {
              appearance: "GHOST",
              label: "Go to Profile",
              isDisabled: disabledWhen(isEmpty("/employee/loaded")),
              to: {
                path: $template`${PROFILE_URL}${$state("/selection/employeeRoleId")}`,
                openInNewTab: true,
              },
            },
          }),
        ],
      }),
    ],
  });

  // -- Create New Discussion sub-section -----------------------------------
  const isWarningType = equals($state("/newDiscussion/type"), "Warning");
  const isAttendanceReason = equals(
    $state("/newDiscussion/reason"),
    "Attendance"
  );

  /** Once the record exists the initial choices are fixed. */
  const createdAlready = isSet("/created/id");

  const reasonSelect = (type: string, options: string[]) =>
    Select({
      visible: equals($state("/newDiscussion/type"), type),
      props: {
        label: "Discussion Reason",
        isRequired: true,
        placeholder: "Select",
        isDisabled: $cond(
          createdAlready,
          true,
          $cond(isSet("/newDiscussion/reason"), true, false)
        ),
        list: options.map((o) => ({ label: o, value: o })),
        value: { $bindState: "/newDiscussion/reason" },
      },
    });

  const createSection = VStack({
    visible: isOn("/ui/showCreate"),
    props: { gap: "space400", padding: { bottom: "space1200" } },
    children: [
      HStack({
        props: { gap: "space300", align: "center" },
        children: [
          Heading({ props: { level: 2, text: "Create New Discussion" } }),
          Switch({
            props: {
              // Hides the section without discarding anything in it.
              value: { $bindState: "/ui/showCreate" },
              onLabel: "Toggle to Hide"
            },
          }),
        ],
      }),
      AtomsSeparator({ props: {} }),

      HStack({
        props: { gap: "space400", align: "flex-start", wrap: "wrap" },
        children: [
          Select({
            props: {
              label: "Discussion Type",
              isRequired: true,
              placeholder: "Select",
              isDisabled: $cond(
                createdAlready,
                true,
                $cond(isSet("/newDiscussion/type"), true, false)
              ),
              list: [
                { label: "Memo of Conversation", value: "Memo of Conversation" },
                { label: "Warning", value: "Warning" },
                { label: "Termination Notice", value: "Termination Notice" },
              ],
              value: { $bindState: "/newDiscussion/type" },
            },
          }),
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
            visible: isWarningType,
            props: {
              label: "Warning Level",
              isRequired: true,
              placeholder: "Select",
              isDisabled: $cond(
                createdAlready,
                true,
                $cond(
                  isSet("/newDiscussion/warningLevel"),
                  true,
                  $cond(isEmpty("/newDiscussion/reason"), true, false)
                )
              ),
              list: [
                { label: "First", value: "First" },
                { label: "Second", value: "Second" },
                { label: "Final", value: "Final" },
              ],
              value: { $bindState: "/newDiscussion/warningLevel" },
            },
          }),
          VStack({
            visible: isAttendanceReason,
            props: { gap: "space050", justify: "center" },
            children: [
              Text({
                props: {
                  text: "Attendance Policy",
                  typestyle: "typestyleBodySmall600",
                },
              }),
              Text({
                props: {
                  text: $state("/employee/attendancePolicy"),
                  typestyle: "typestyleBodyMedium",
                },
              }),
            ],
          }),
          VStack({
            visible: isWarningType,
            props: { gap: "space050", justify: "center" },
            children: [
              Text({
                props: {
                  text: "Warning Type",
                  typestyle: "typestyleBodySmall600",
                },
              }),
              Text({
                props: {
                  text: $cond(
                    equals($state("/newDiscussion/warningLevel"), "First"),
                    "Verbal",
                    $cond(
                      equals($state("/newDiscussion/warningLevel"), "Second"),
                      "Written",
                      $cond(
                        equals($state("/newDiscussion/warningLevel"), "Final"),
                        "Final Written",
                        EMPTY
                      )
                    )
                  ),
                  typestyle: "typestyleBodyMedium",
                },
              }),
            ],
          }),
          VStack({
            visible: isWarningType,
            props: { gap: "space050", justify: "center" },
            children: [
              Text({
                props: {
                  text: "Monitoring Period",
                  typestyle: "typestyleBodySmall600",
                },
              }),
              Text({
                props: {
                  // Attendance follows the policy; otherwise the level decides.
                  text: $cond(
                    isAttendanceReason,
                    $cond(
                      equals($state("/employee/attendancePolicy"), "Logistics"),
                      "90",
                      "180"
                    ),
                    $cond(
                      equals($state("/newDiscussion/warningLevel"), "Final"),
                      "180",
                      $cond(isSet("/newDiscussion/warningLevel"), "90", EMPTY)
                    )
                  ),
                  typestyle: "typestyleBodyMedium",
                },
              }),
            ],
          }),
        ],
      }),

      Checkbox({
        props: {
          label: CREATE_ATTESTATION,
          value: { $bindState: "/newDiscussion/attestationChecked" },
          isDisabled: $cond(
            createdAlready,
            true,
            $cond(
              isWarningType,
              $cond(isEmpty("/newDiscussion/warningLevel"), true, false),
              $cond(isEmpty("/newDiscussion/reason"), true, false)
            )
          ),
        },
      }),

      HStack({
        props: { gap: "space200", justify: "center" },
        children: [
          Button({
            props: {
              appearance: "PRIMARY",
              label: "Begin New Discussion",
              isDisabled: $cond(
                createdAlready,
                true,
                $cond(isOff("/newDiscussion/attestationChecked"), true, false)
              ),
            },
            on: {
              press: [
                setState({ statePath: "/ui/showCreateDetails", value: true }),
                triggerFunction({
                  functionApiName,
                  inputs: {
                    action: "createDiscussion",
                    empId: $state("/selection/employeeRoleId"),
                    type: $state("/newDiscussion/type"),
                    reason: $state("/newDiscussion/reason"),
                    warningLevel: $state("/newDiscussion/warningLevel"),
                  },
                  responsePath: "/created",
                }),
              ] 
            },
          }),
          Button({
            props: {
              appearance: "DESTRUCTIVE",
              label: "Reset Type, Reason, and/or Level",
              // Once the record exists these choices are written to it, so
              // resetting here would leave the form and the record disagreeing.
              isDisabled: disabledWhen(createdAlready),
            },
            on: {
              press: [
                setState({ statePath: "/newDiscussion/type", value: "" }),
                setState({ statePath: "/newDiscussion/reason", value: "" }),
                setState({
                  statePath: "/newDiscussion/warningLevel",
                  value: "",
                }),
                setState({
                  statePath: "/newDiscussion/attestationChecked",
                  value: false,
                }),
              ],
            },
          }),
        ],
      }),

      // Opens in place once the record exists.
      discussionDetailsCard({
        record: "/created",
        details: "/details",
        cards: "/cards",
        submission: "/submission",
        openPath: "/ui/showCreateDetails",
        // Returns the section to a blank slate, the same way the Reset button
        // does. /submission is deliberately left alone — the snackbar reads
        // its result, so clearing it would dismiss the confirmation.
        afterSubmit: [
          setState({
            statePath: "/newDiscussion",
            value: {
              type: "",
              reason: "",
              warningLevel: "",
              attestationChecked: false,
            },
          }),
          setState({ statePath: "/created", value: emptyRecord }),
          setState({ statePath: "/details", value: emptyDetails }),
          setState({ statePath: "/cards", value: emptyCards }),
          setState({ statePath: "/ui/showCreateDetails", value: false }),
        ]
      }),
    ],
  });

  // -- Review Existing Discussions sub-section -----------------------------
  const [inProgressRepeat, ipRow] = repeat("/employee/history/inProgress", "id");
  const [activeRepeat, acRow] = repeat("/employee/history/active", "id");
  const [archivedRepeat, arRow] = repeat("/employee/history/archived", "id");
  const [canceledRepeat, cxRow] = repeat("/employee/history/canceled", "id");

  const rowText = (row: any) =>
    VStack({
      props: { gap: "space050", grow: 1 },
      children: [
        Text({
          props: {
            text: row.$("headline"),
            typestyle: "typestyleBodyMedium600",
          },
        }),
        HStack({
          props: { gap: "space100", wrap: "wrap" },
          children: [
            Text({
              props: {
                text: row.$("detail"),
                typestyle: "typestyleBodySmall",
                color: "colorOnSurfaceVariant",
              },
            }),
            Text({
              props: {
                text: row.$("sentDetail"),
                typestyle: "typestyleBodySmall",
                color: "colorOnSurfaceVariant",
              },
            }),
          ],
        }),
      ],
    });

  const viewButton = (row: any) =>
    Button({
      props: {
        appearance: "OUTLINE",
        label: "View",
        size: "S",
        // Renders as an anchor, so the absolute URL is followed directly
        // rather than routed through the app.
        to: { path: row.$("url"), openInNewTab: true },
      },
    });

  /**
   * Loads a record into the review workspace.
   *
   * Two calls because triggerFunction writes one responsePath each: the
   * header fields go to /editing, the saved inputs to /editDetails.
   */
  const editButton = (row: any) =>
    Button({
      props: { appearance: "OUTLINE", label: "Edit/Review", size: "S" },
      on: {
        press: [
          setState({ statePath: "/ui/showEditDetails", value: true }),
          setState({ statePath: "/editCards", value: emptyCards }),
          setState({ statePath: "/editSubmission", value: emptySubmission }),
          triggerFunction({
            functionApiName,
            inputs: { action: "loadForEdit", recordId: row.$("id") },
            responsePath: "/editing",
          }),
          triggerFunction({
            functionApiName,
            inputs: { action: "loadEditDetails", recordId: row.$("id") },
            responsePath: "/editDetails",
          }),
        ],
      },
    });

  const inProgressList = VStack({
    visible: equals($state("/history/tab"), "inProgress"),
    repeat: inProgressRepeat,
    props: { gap: "space300" },
    children: [
      HStack({
        props: { gap: "space300", align: "flex-start" },
        children: [
          viewButton(ipRow), 
          editButton(ipRow), 
          Button({
            visible: equals(ipRow.$("showApprove"), "yes"),
            props: {
              appearance: "PRIMARY",
              label: "Approve",
              size: "S",
            },
            on: {
              press: triggerFunction({
                functionApiName,
                inputs: {
                  action: "approveDiscussion",
                  recordId: ipRow.$("id"),
                },
                responsePath: "/history/message",
              }),
            },
          }),
          Button({
            props: {
              appearance: "DESTRUCTIVE",
              label: "Cancel Discussion",
              size: "S",
            },
            on: {
              press: triggerFunction({
                functionApiName,
                inputs: {
                  action: "cancelDiscussion",
                  recordId: ipRow.$("id"),
                },
                responsePath: "/history/message",
              }),
            },
          }),
          rowText(ipRow)
        ],
      }),
    ],
  });

  const activeList = VStack({
    visible: equals($state("/history/tab"), "active"),
    repeat: activeRepeat,
    props: { gap: "space300" },
    children: [
      HStack({
        props: { gap: "space300", align: "flex-start" },
        children: [
          viewButton(acRow),
          Button({
            props: {
              appearance: "PRIMARY",
              label: "Send Document",
              size: "S",
            },
            on: {
              press: triggerFunction({
                functionApiName,
                inputs: {
                  action: "confirmDocument",
                  recordId: acRow.$("id"),
                },
                responsePath: "/history/message",
              }),
            },
          }),
          rowText(acRow),
        ],
      }),
    ],
  });

  const archivedList = VStack({
    visible: equals($state("/history/tab"), "archived"),
    repeat: archivedRepeat,
    props: { gap: "space300" },
    children: [
      HStack({
        props: { gap: "space300", align: "flex-start" },
        children: [
          viewButton(arRow),
          Button({
            props: {
              appearance: "PRIMARY",
              label: "Send Document",
              size: "S",
              // Only terminations and positive feedback still warrant a
              // document once archived.
              isDisabled: $cond(equals(arRow.$("canSend"), "yes"), false, true),
            },
            on: {
              press: triggerFunction({
                functionApiName,
                inputs: {
                  action: "confirmDocument",
                  recordId: arRow.$("id"),
                },
                responsePath: "/history/message",
              }),
            },
          }),
          rowText(arRow),
        ],
      }),
    ],
  });

  const canceledList = VStack({
    visible: equals($state("/history/tab"), "canceled"),
    repeat: canceledRepeat,
    props: { gap: "space300" },
    children: [
      HStack({
        props: { gap: "space300", align: "flex-start" },
        children: [viewButton(cxRow), editButton(cxRow), rowText(cxRow)],
      }),
    ],
  });

  const reviewSection = VStack({
    visible: isOn("/ui/showReview"),
    props: { gap: "space400" },
    children: [
      HStack({
        props: { gap: "space300", align: "center" },
        children: [
          Heading({ props: { level: 2, text: "Review Existing Discussions" } }),
          Switch({ 
            props: { 
              value: { $bindState: "/ui/showReview" }, 
              onLabel: "Toggle to Hide"
            } 
          }),
        ],
      }),
      AtomsSeparator({ props: {} }),

      HStack({
        props: { justify: "center" },
        children: [
          Button({
            props: {
              appearance: "GHOST",
              label: "Click to reload recent changes",
              size: "S",
            },
            on: {
              // Re-runs the same load the Select button uses, so the tabs and
              // counts pick up anything saved since the page opened. This also
              // refreshes the prior-matters options and the info panel, since
              // they come from the same response.
              press: triggerFunction({
                functionApiName,
                inputs: {
                  action: "loadEmployee",
                  empId: $state("/selection/employeeRoleId"),
                },
                responsePath: "/employee",
              }),
            },
          }),
        ],
      }),

      Tab({
        props: {
          type: "LINK",
          // Counts come from state, so these need templates. If the strip
          // renders them literally, the counts move to a Text above it.
          items: [
            {
              title: $template`In Progress (${$state(
                "/employee/inProgressCount"
              )})`,
              value: "inProgress",
            },
            {
              title: $template`Active (${$state("/employee/activeCount")})`,
              value: "active",
            },
            {
              title: $template`Archived (${$state("/employee/archivedCount")})`,
              value: "archived",
            },
            {
              title: $template`Canceled (${$state("/employee/canceledCount")})`,
              value: "canceled",
            },
          ],
          value: { $bindState: "/history/tab" },
        },
      }),

      Text({
        visible: isSet("/history/message"),
        props: {
          text: $state("/history/message"),
          typestyle: "typestyleBodySmall",
          color: "colorOnSurfaceVariant",
        },
      }),

      inProgressList,
      activeList,
      archivedList,
      canceledList,

      // A second, independent instance — so an existing record can be revised
      // alongside a new one being drafted above.
      discussionDetailsCard({
        record: "/editing",
        details: "/editDetails",
        cards: "/editCards",
        submission: "/editSubmission",
        openPath: "/ui/showEditDetails",
      }),
    ],
  });

  const byTeamMember = VStack({
    visible: equals($state("/nav/section"), "/by-team-member"),
    props: { gap: "space800" },
    children: [
      VStack({
        props: { gap: "space300" },
        children: [
          Heading({
            props: { level: 2, text: "Performance Discussion Actions: By Team Member" },
          }),
          AtomsSeparator({ props: {} }),
          HStack({
            props: { gap: "space600", align: "flex-start" },
            children: [
              selectionColumn, 
              infoColumn
            ],
          }),
        ],
      }),
      createSection,
      reviewSection,
    ],
  });

  const [deptRepeat, deptRow] = repeat("/department/rows", "id");

  const byDepartment = VStack({
    visible: equals($state("/nav/section"), "/by-department"),
    props: { gap: "space400" },
    children: [
      Heading({
        props: { level: 2, text: "Performance Discussion Actions: By Department" },
      }),
      AtomsSeparator({ props: {} }),
      VStack({
        props: { gap: "space300" },
        children: [
          step("1", "Load the department list", [
            "Click Load departments below. The list takes a moment to build and needs to be loaded once per visit.",
          ]),
          HStack({
            props: { gap: "space400", padding: { left: "space1200", bottom: "space300" }, align: "flex-end", wrap: "wrap" },
            children: [
              Button({
                props: {
                  appearance: "OUTLINE",
                  label: "Load departments",
                  size: "S",
                },
                on: {
                  press: [
                    triggerFunction({
                      functionApiName,
                      inputs: { action: "loadDepartments" },
                      responsePath: "/department/options",
                    }),
                    setState({ statePath: "/department/hasOptions", value: "yes" }),
                  ],
                },
              }),
            ]
          }), 
          step("2", "Choose your filters", [
            "Pick a department, a timeframe, and one or more statuses, then click Load discussions. Leave Status empty to include all.",
          ]),
        ],
      }),

      HStack({
        props: { gap: "space400", align: "flex-end", wrap: "wrap" },
        children: [
          HStack({
            props: { gap: "space200", align: "flex-end" },
            children: [
              Select({
                props: {
                  label: "Department",
                  placeholder: "Load departments first",
                  isSearchable: true,
                  // The list is empty until the load runs, so selecting is
                  // pointless before then.
                  isDisabled: disabledWhen(isEmpty("/department/hasOptions")),
                  list: { $bindState: "/department/options" },
                  value: { $bindState: "/department/selected" },
                },
              }),
            ],
          }),
          Select({
            props: {
              label: "Created within",
              placeholder: "Select",
              list: TIMEFRAMES.map((t) => ({ label: t.label, value: t.value })),
              value: { $bindState: "/department/timeframe" },
            },
          }),
          Select({
            props: {
              label: "Status",
              placeholder: "Select one or more",
              isMulti: true,
              canSelectAll: true,
              list: STATUSES.map((s) => ({ label: s, value: s })),
              value: { $bindState: "/department/statuses" },
            },
          }),
          Button({
            props: {
              appearance: "PRIMARY",
              label: "Load discussions",
              isDisabled: $cond(
                isEmpty("/department/selected"),
                true,
                $cond(isEmpty("/department/timeframe"), true, false)
              ),
            },
            on: {
              press: triggerFunction({
                functionApiName,
                inputs: {
                  action: "loadByDepartment",
                  departmentId: $state("/department/selected"),
                  timeframe: $state("/department/timeframe"),
                  statuses: $state("/department/statuses"),
                  options: $state("/department/options"),
                  hasOptions: $state("/department/hasOptions"),
                },
                responsePath: "/department",
              }),
            },
          }),
        ],
      }),

      Text({
        visible: isSet("/department/message"),
        props: {
          text: $state("/department/message"),
          typestyle: "typestyleBodySmall",
          color: "colorOnSurfaceVariant",
        },
      }),

      VStack({
        repeat: deptRepeat,
        props: { gap: "space300" },
        children: [
          HStack({
            props: { gap: "space300", align: "flex-start" },
            children: [
              viewButton(deptRow),
              Box({
                props: { basis: "180px", shrink: 0 },
                children: [
                  Text({
                    props: {
                      text: deptRow.$("employeeName"),
                      typestyle: "typestyleBodyMedium600",
                    },
                  }),
                ],
              }),
              rowText(deptRow),
            ],
          }),
        ],
      }),
    ],
  });

  /**
   * Hand-built rather than AppNavBar: that component performs real routing and
   * navigates the browser away from the page. These buttons just set state.
   */
  const navItem = (path: string, label: string) =>
    Button({
      props: {
        appearance: $cond(equals($state("/nav/section"), path), "INFO", "GHOST"),
        label,
        isFluid: true,
      },
      on: { press: setState({ statePath: "/nav/section", value: path }) },
    });

  const sidebar = Box({
    props: {
      backgroundColor: "colorSurfaceContainer",
      padding: "space400",
      radius: "shapeCornerMd",
      width: "240px",
      shrink: 0,
    },
    children: [
      VStack({
        props: { gap: "space400" },
        children: [
          Heading({ props: { level: 3, text: "Performance Discussion Actions" } }),
          VStack({
            props: { gap: "space100" },
            children: [
              navItem("/by-team-member", "By Team Member"),
              navItem("/by-department", "By Department"),
            ],
          }),
        ],
      }),
    ],
  });

  const root = HStack({
    props: { gap: "space500", padding: "space500", align: "flex-start" },
    children: [
      sidebar,
      VStack({
        props: { gap: "space500", grow: 1 },
        children: [
          byTeamMember, 
          byDepartment,
        ],
      }),
      SnackBar({
        props: {
          appearance: "SUCCESS",
          text: "Your discussion has been submitted and, if necessary, sent for approval.",
          canDismiss: true,
          persist: true,
          id: "submit-success-create", 
          isVisible: { $bindState: "/submission/showSnack" },
        },
        on: {
          dismiss: setState({ statePath: "/submission/showSnack", value: false }),
        },
      }),
      SnackBar({
        props: {
          appearance: "SUCCESS",
          text: "Your discussion has been submitted and, if necessary, sent for approval.",
          canDismiss: true, 
          persist: true,
          id: "submit-success-review", 
          isVisible: { $bindState: "/editSubmission/showSnack" },
        },
        on: {
          dismiss: setState({ statePath: "/editSubmission/showSnack", value: false }),
        },
      }),
      SnackBar({
        props: {
          appearance: "ERROR",
          text: "Your discussion couldn't be submitted. The discussion is saved as a draft — find it under Review Existing Discussions. Try to submit again, or reach out to People Operations.",
          canDismiss: true,
          persist: true,
          id: "submit-error-create",
          isVisible: { $bindState: "/submission/showSnackError" },
        },
        on: {
          dismiss: setState({ statePath: "/submission/showSnackError", value: false }),
        },
      }),
      SnackBar({
        props: {
          appearance: "ERROR",
          text: "Your discussion couldn't be submitted. Nothing was lost — try to submit again, or reach out to People Operations.",
          canDismiss: true,
          persist: true,
          id: "submit-error-review",
          isVisible: { $bindState: "/editSubmission/showSnackError" },
        },
        on: {
          dismiss: setState({ statePath: "/editSubmission/showSnackError", value: false }),
        },
      }),
    ],
  });

  return render({ root, state: initialState });
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function splitParagraphs(text: unknown): string[] {
  return String(text ?? "")
    .replace(/\n+/g, "\n")
    .split(/\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Returns the first failure, so the user fixes one thing at a time. */
function checkLongText(
  value: string,
  label: string,
  maxParagraphs: number,
  maxChars: number
): string {
  const raw = String(value ?? "").trim();
  const paragraphs = splitParagraphs(raw);

  if (raw.replace(/\n/g, "").trim().length < 100) {
    return `${label} must be at least 100 characters.`;
  }
  if (paragraphs.length > maxParagraphs) {
    return `${label} can have at most ${maxParagraphs} paragraphs. Combine or remove some.`;
  }
  const over = paragraphs.findIndex((p) => p.length > maxChars);
  if (over !== -1) {
    return `Paragraph ${over + 1} of ${label} is over ${maxChars} characters. Break it into shorter sections.`;
  }
  return "";
}

/**
 * The latest date a recorded event may carry: the earlier of the record's
 * creation date and the communication date, when one exists.
 *
 * Dates are YYYY-MM-DD, so a string compare orders them correctly — and
 * sidesteps the timezone shifts Date.parse introduces.
 */
function dateCeiling(createdDate: string, communicationDate: string): string {
  const created = String(createdDate ?? "").slice(0, 10);
  const comms = String(communicationDate ?? "").slice(0, 10);
  if (!comms || comms === NO_DATE) return created;
  if (!created || created === NO_DATE) return comms;
  return comms < created ? comms : created;
}

function checkDateCeiling(value: string, label: string, ceiling: string): string {
  const d = String(value ?? "").slice(0, 10);
  if (!d || !ceiling) return "";
  return d > ceiling ? `${label} must be on or before ${ceiling}.` : "";
}

/** Shifts a YYYY-MM-DD date by whole days. Empty in, empty out. */
function addDays(date: string, days: number): string {
  const d = String(date ?? "").slice(0, 10);
  if (!d || d === NO_DATE) return "";
  const t = new Date(d + "T00:00:00Z");
  if (isNaN(t.getTime())) return "";
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
}

/** The earlier of two dates, ignoring empties and the placeholder. */
function earlier(a: string, b: string): string {
  const x = String(a ?? "").slice(0, 10);
  const y = String(b ?? "").slice(0, 10);
  if (!x || x === NO_DATE) return y && y !== NO_DATE ? y : "";
  if (!y || y === NO_DATE) return x;
  return y < x ? y : x;
}

const ok = (msg: string) =>
  new FunctionResponse({
    body: { error: "", saved: "yes" } as unknown as Record<string, unknown>,
    statusCode: 200,
    headers: {},
    message: msg,
  });

const rejected = (error: string) =>
  new FunctionResponse({
    body: { error, saved: "" } as unknown as Record<string, unknown>,
    statusCode: 200,
    headers: {},
    message: `rejected: ${error}`,
  });

const failed = (msg: string) =>
  new FunctionResponse({
    body: {
      error: `Couldn't save. If the problem persists, reach out to ${SUPPORT_CONTACT}.`,
      saved: "",
    } as unknown as Record<string, unknown>,
    statusCode: 200,
    headers: {},
    message: msg,
  });

// ---------------------------------------------------------------------------
// Data access
// ---------------------------------------------------------------------------

function isFlagTrue(value: unknown): boolean {
  return value === true || value === "true" || value === "True";
}

function makeFetch(token: string) {
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };

  /** Hard ceiling, so a hung upstream is catchable rather than a platform kill. */
  const fetchWithTimeout = async (url: string, init: RequestInit) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };

  const getJson = async (url: string) => {
    const r = await fetchWithTimeout(url, { method: "GET", headers });
    return r.ok ? await r.json() : null;
  };

  return { headers, fetchWithTimeout, getJson };
}

async function patchRecord(
  recordId: string,
  fields: Record<string, unknown>,
  token: string,
  apiName: string
): Promise<void> {
  const { headers, fetchWithTimeout } = makeFetch(token);
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/custom-objects/${encodeURIComponent(
      apiName
    )}/records/${encodeURIComponent(recordId)}/`,
    {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    }
  );
  if (!res.ok) {
    throw new Error(`patch ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

async function getRecord(
  recordId: string,
  token: string,
  apiName: string
): Promise<Record<string, any>> {
  const { headers, fetchWithTimeout } = makeFetch(token);
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/custom-objects/${encodeURIComponent(
      apiName
    )}/records/${encodeURIComponent(recordId)}/`,
    { method: "GET", headers }
  );
  if (!res.ok) throw new Error(`retrieve ${res.status}`);
  const envelope = (await res.json()) as Record<string, any>;
  return envelope?.data ?? envelope;
}

/** "WD - 1508 | Warning > First > Verbal | Performance" */
function formatHeadline(r: Record<string, any>): string {
  const typePart = [r.discussion_type__c, r.warning_level__c, r.warning_type__c]
    .filter((v) => v && v !== "--")
    .join(" > ");
  const reason = Array.isArray(r.discussion_reason__c)
    ? r.discussion_reason__c.join(", ")
    : r.discussion_reason__c ?? "";
  return [r.name, typePart, reason].filter(Boolean).join(" | ");
}

/** Dates fall back to the placeholder, so an unset date reads as deliberate. */
function formatDetail(r: Record<string, any>): string {
  return [
    `Status: ${r.status__c ?? "-"}`,
    `Finalized on: ${r.finalized_date_date_only__c || NO_DATE}`,
    `Monitoring end: ${r.monitoring_period_end_date__c || NO_DATE}`,
    `Created by: ${r.submitted_by__c?.display_value ?? (r.created_by?.display_value ?? "-")}`,
  ].join(" :: ");
}

function toHistoryRow(
  r: Record<string, any>, 
  includeSent: boolean,
  canApprove: boolean
): HistoryRow {
  const reasons: string[] = Array.isArray(r.discussion_reason__c)
    ? r.discussion_reason__c
    : r.discussion_reason__c
    ? [r.discussion_reason__c]
    : [];

  // Archived records are historical, so a document only makes sense where it
  // does not read as a live warning: terminations and positive feedback.
  const canSend =
    r.discussion_type__c === "Termination Notice" ||
    reasons.includes("Positive Feedback")
      ? "yes"
      : "";

  // Both halves resolved here, since the spec cannot combine two conditions.
  const showApprove =
    canApprove && r.status__c === "Pending Approval" ? "yes" : "";

  return {
    id: r.id ?? "",
    url: `${RECORD_URL}${r.id ?? ""}`,
    headline: formatHeadline(r),
    detail: formatDetail(r),
    sentDetail: includeSent
      ? `|| Document sent on: ${r.discussion_document_sent_date__c || "N/A"}`
      : "",
    canSend,
    showApprove, 
  };
}

function toRecordHeader(record: Record<string, any>): RecordHeader {
  const reasons: string[] = Array.isArray(record.discussion_reason__c)
    ? record.discussion_reason__c
    : record.discussion_reason__c
    ? [record.discussion_reason__c]
    : [];

  const positive = reasons.includes("Positive Feedback");
  const abandonment = reasons.includes("Job Abandonment");
  const termination = record.discussion_type__c === "Termination Notice";

  const created = String(record.created_date__c ?? "").slice(0, 10);
  const comms = String(record.communication_date__c ?? "").slice(0, 10);

  // Each NCNS date must leave room for the ones after it, so the ceilings
  // step back a day at a time.
  const dateBounds: DateBounds = {
    feedbackMax: earlier(created, comms),
    ncns1Max: earlier(addDays(created, -2), comms),
    ncns2Max: earlier(addDays(created, -1), comms),
    ncns3Max: earlier(created, comms),
    incidentMax: earlier(created, comms),
    commMax: created,
  };
  
  return {
    id: record.id ?? "",
    name: record.name ?? "",
    status: record.status__c ?? "",
    type: record.discussion_type__c ?? "",
    reason: reasons.join(", "),
    warningLevel: record.warning_level__c === "--" ? "" : (record.warning_level__c ?? ""),
    warningType: record.warning_type__c ?? "",
    monitoringEndDate: record.monitoring_period_end_date__c || NO_DATE,
    finalizedDate: record.finalized_date_date_only__c || NO_DATE,
    createdDate: record.created_date__c ?? "",
    communicationDate: record.communication_date__c ?? "",
    createdById: record.created_by?.id ?? "",
    createdByName: record.created_by?.display_value ?? "",
    submittedById: record.submitted_by__c?.id ?? "", 
    submittedByName: record.submitted_by__c?.display_value ?? "", 
    showFeedback: positive ? "yes" : "",
    showIncident: positive ? "" : "yes",
    showPriorMatters: positive ? "" : "yes",
    showAddtlInfo: termination ? "yes" : "",
    showActionPlan: !positive && !termination ? "yes" : "",
    isAbandonment: abandonment ? "yes" : "",
    dateBounds, 
  };
}

/** Maps an API record back onto the card inputs, for Edit/Review. */
function toDetailsState(record: Record<string, any>): DetailsState {

  return {
    feedbackDate: record.date_of_feedback__c ?? "",
    feedbackDetails: record.feedback_details_00__c ?? "",
    ncns1: record.ncns_date_1__c ?? "",
    ncns2: record.ncns_date_2__c ?? "",
    ncns3: record.ncns_date_3__c ?? "",
    incidentDate: record.date_of_incident__c ?? "",
    incidentDetails: record.description_of_incident_00__c ?? "",
    includePriorMatters: isFlagTrue(record.show_violations_and_occurrences__c),
    // Stored as one line per record; the multi-select wants an array.
    priorMattersSelected: String(record.prior_matters_00__c ?? "")
      .split("\n")
      .filter(Boolean),
    includeAddtlContext: isFlagTrue(record.show_additional_context__c),
    addtlContext: record.additional_context_00__c ?? "",
    includeActionPlan: isFlagTrue(record.show_action_plan__c),
    actionPlan: record.action_plan_00__c ?? "",
    includeComms: isFlagTrue(record.show_communication_details__c),
    commDate: record.communication_date__c ?? "",
    commMethod: record.communication_method__c ?? "",
    // Attachments are not read back — the file inputs start empty on edit.
    commRecording: [],
    witness: record.witness__c?.id ?? record.witness__c ?? "",
    commEmail: [],
  };
}

/**
 * Whether the viewer may open a discussion about this team member.
 *
 * Rules in ACCESS_RULES are tried first; a grant from any of them ends the
 * check. Otherwise the reporting line decides, walking up from the target
 * until the viewer appears or the hops run out.
 */
async function checkAccess(
  viewer: Party,
  target: Party,
  targetWorker: Record<string, any>,
  token: string
): Promise<{ allowed: boolean; why: string }> {
  // Without a viewer id there is nothing to compare against.
  if (!viewer.roleId) return { allowed: true, why: "no viewer id" };

  for (const rule of ACCESS_RULES) {
    if (!rule.applies(viewer)) continue;
    if (!rule.grants || rule.grants(target)) {
      return { allowed: true, why: rule.name };
    }
  }

  const { getJson } = makeFetch(token);
  let managerId = String(targetWorker?.manager_id ?? "");

  for (let hop = 1; hop <= MAX_MANAGER_HOPS && managerId; hop += 1) {
    if (managerId === viewer.roleId) {
      return { allowed: true, why: `reporting line, level ${hop}` };
    }
    const next = await getJson(
      `${API_BASE_URL}/workers/${encodeURIComponent(managerId)}`
    );
    managerId = String(next?.manager_id ?? "");
  }

  return { allowed: false, why: "no rule matched, not in reporting line" };
}

async function loadEmployee(
  empId: string,
  viewerRoleId: string, 
  token: string,
  apiName: string
): Promise<{ panel: EmployeePanel; accessWhy: string; viewerRaw: string }> {

  const { headers, fetchWithTimeout, getJson } = makeFetch(token);

  const loadViewer = async () => {
    if (!viewerRoleId) return null;
    const v = await getJson(
      `${API_BASE_URL}/workers/${encodeURIComponent(viewerRoleId)}?expand=department`
    );
    if (!v) return null;

    const department = String(v?.department?.name ?? "");
    const title = String(v?.title ?? "");

    // The parent name needs a second call, so it is only fetched where a rule
    // actually reads it. People Operations matches on department alone.
    let parentDepartment = "";
    if (department === "Dispatch") {
      const parentId = v?.department?.parent_id || null;
      const parent = parentId
        ? await getJson(`${API_BASE_URL}/departments/${encodeURIComponent(parentId)}`)
        : null;
      parentDepartment = String(parent?.name ?? "");
    }

    return { department, parentDepartment, title };
  };

  // Resolved before the parallel loads so loadDiscussions can close over it.
  const viewer = await loadViewer().catch(() => null);
  const canApprove = viewer?.department === "People Operations";

  const loadWorker = async () => {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/workers/${encodeURIComponent(
        empId
      )}?expand=department,user,manager`,
      { method: "GET", headers }
    );
    if (!res.ok) throw new Error(`worker ${res.status}`);
    const worker = (await res.json()) as Record<string, any>;

    // Expand does not recurse: department.parent, manager.user, and the work
    // location come back unresolved, so each needs its own fetch.
    const parentDeptId = worker?.department?.parent_id || null;
    const workLocationId = worker?.location?.work_location_id || null;
    const managerId = worker?.manager_id || null;

    const [parentDept, workLocation, managerWorker] = await Promise.allSettled([
      parentDeptId
        ? getJson(`${API_BASE_URL}/departments/${encodeURIComponent(parentDeptId)}`)
        : Promise.resolve(null),
      workLocationId
        ? getJson(
            `${API_BASE_URL}/work-locations/${encodeURIComponent(workLocationId)}`
          )
        : Promise.resolve(null),
      managerId
        ? getJson(
            `${API_BASE_URL}/workers/${encodeURIComponent(managerId)}?expand=user`
          )
        : Promise.resolve(null),
    ]);

    const val = (r: PromiseSettledResult<any>) =>
      r.status === "fulfilled" ? r.value : null;
    const parent = val(parentDept);
    const location = val(workLocation);
    const mgr = val(managerWorker);

    return {
      worker,
      departmentName: worker?.department?.name ?? "",
      departmentParentName: parent?.name ?? "",
      workLocationName: location?.name ?? "",
      // A worker record has no name field — it lives on the linked user.
      managerName: mgr?.user?.display_name ?? mgr?.work_email ?? "",
    };
  };

  const loadDiscussions = async () => {
    const endpoint = `${API_BASE_URL}/custom-objects/${encodeURIComponent(
      apiName
    )}/records/query/`;
    const query = `owner_role.id = '${empId}'`;
    const rows: Array<Record<string, any>> = [];
    let cursor: string | undefined = undefined;
    let page = 0;

    do {
      const requestBody: Record<string, unknown> = { query, limit: PAGE_LIMIT };
      if (cursor) requestBody.cursor = cursor;

      const res = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!res.ok) throw new Error(`discussions ${res.status}`);

      const data = (await res.json()) as { results?: any[]; cursor?: string | null };
      for (const row of data.results ?? []) rows.push(row);

      page += 1;
      const next = data.cursor ?? undefined;
      // A repeated cursor would re-fetch the same page indefinitely.
      if (next && next === cursor) break;
      cursor = next;
    } while (cursor && page < MAX_PAGES);

    // Active = Finalized with a flag still set. Archived = Finalized with
    // neither. In Progress = anything else that is not Canceled.
    const active = rows.filter(
      (r) =>
        r.status__c === "Finalized" &&
        (isFlagTrue(r.active_memo__c) || isFlagTrue(r.active_warning__c))
    );
    const archived = rows.filter(
      (r) =>
        r.status__c === "Finalized" &&
        !isFlagTrue(r.active_memo__c) &&
        !isFlagTrue(r.active_warning__c)
    );
    const canceled = rows.filter((r) => r.status__c === "Canceled");
    const inProgress = rows.filter(
      (r) => r.status__c !== "Canceled" && r.status__c !== "Finalized"
    );

    const byNewest = (a: any, b: any) =>
      String(b.created_date__c ?? "").localeCompare(
        String(a.created_date__c ?? "")
      );

    // The option's value IS its label, so a selection arrives ready to store.
    const priorMattersOptions: PriorMatterOption[] = [...active]
      .sort(byNewest)
      .slice(0, PRIOR_MATTERS_LIMIT)
      .map((r) => {
        const line = formatHeadline(r);
        return { label: line, value: line };
      });

    const latest = [...active, ...inProgress]
      .filter((r) => r.date_submitted_date_only__c)
      .sort((a, b) =>
        String(b.date_submitted_date_only__c).localeCompare(
          String(a.date_submitted_date_only__c)
        )
      )[0];

    const history: DiscussionHistory = {
      inProgress: [...inProgress].sort(byNewest).map((r) => toHistoryRow(r, false, canApprove)),
      active: [...active].sort(byNewest).map((r) => toHistoryRow(r, true, canApprove)),
      archived: [...archived].sort(byNewest).map((r) => toHistoryRow(r, true, canApprove)),
      canceled: [...canceled].sort(byNewest).map((r) => toHistoryRow(r, false, canApprove)),
    };

    return {
      activeCount: String(active.length),
      inProgressCount: String(inProgress.length),
      archivedCount: String(archived.length),
      canceledCount: String(canceled.length),
      mostRecentSubmitted: latest
        ? `${latest.date_submitted_date_only__c} :: ${latest.name ?? ""}`
        : EMPTY,
      priorMattersOptions,
      history,
    };
  };
  
  const [workerResult, discussionsResult] = await Promise.allSettled([
    loadWorker(),
    loadDiscussions(),
  ]);

  const w = workerResult.status === "fulfilled" ? workerResult.value : null;
  const d = discussionsResult.status === "fulfilled" ? discussionsResult.value : null;
  const worker = w?.worker ?? {};

  const viewerRaw = JSON.stringify(viewer);

  const access = await checkAccess(
    {
      roleId: viewerRoleId,
      department: viewer?.department ?? "",
      parentDepartment: viewer?.parentDepartment ?? "",
      title: viewer?.title ?? "",
    },
    {
      roleId: empId,
      department: w?.departmentName ?? "",
      parentDepartment: w?.departmentParentName ?? "",
      title: String(worker?.title ?? ""),
    },
    worker,
    token
  );

  if (!access.allowed) {
    return {
      panel: {
        ...emptyPanel,
        userMessage:
          "You can only open discussions for people who report to you. If you need access to someone else, reach out to " +
          SUPPORT_CONTACT + ".",
      },
      accessWhy: access.why,
      viewerRaw, 
    };
  }

  // Attendance Policy is derived: a Logistics parent department means the
  // Logistics policy, everything else is Standard.
  const attendancePolicy = w
    ? w.departmentParentName === "Logistics"
      ? "Logistics"
      : "Standard"
    : EMPTY;

  let userMessage = "";
  if (!w && !d) {
    userMessage = `Couldn't load employee details. Click 'Select' to try again. If the problem persists, reach out to ${SUPPORT_CONTACT}.`;
  } else if (!w) {
    userMessage = "Discussions loaded, but employee details couldn't be reached. Click 'Select' to try again.";
  } else if (!d) {
    userMessage = "Employee details loaded, but discussions couldn't be counted. Click 'Select' to try again.";
  }

  return {
    panel: {
      name: worker.user?.display_name || EMPTY, 
      title: worker.title || EMPTY,
      status: worker.status || EMPTY,
      startDate: worker.start_date || EMPTY,
      department: w?.departmentName || EMPTY,
      location: w?.workLocationName || EMPTY,
      manager: w?.managerName || EMPTY,
      activeCount: d?.activeCount ?? EMPTY,
      inProgressCount: d?.inProgressCount ?? EMPTY,
      archivedCount: d?.archivedCount ?? EMPTY,
      canceledCount: d?.canceledCount ?? EMPTY,
      mostRecentSubmitted: d?.mostRecentSubmitted ?? EMPTY,
      attendancePolicy,
      priorMattersOptions: d?.priorMattersOptions ?? [],
      history: d?.history ?? emptyHistory,
      // Both halves must have succeeded before the panel buttons unlock.
      loaded: w && d ? "yes" : "",
      userMessage,
      canApprove: canApprove ? "yes" : "", 
    },   
    accessWhy: access.why, 
    viewerRaw
  };
}

async function createDiscussion(
  args: { 
    empId: string; 
    type: string; 
    reason: string; 
    warningLevel: string; 
    submittedBy: string; 
    changedBy: string;  
  },
  token: string,
  apiName: string
): Promise<RecordHeader> {
  const { headers, fetchWithTimeout } = makeFetch(token);

  const body: Record<string, unknown> = {
    owner_role: args.empId,
    discussion_type__c: args.type,
    // Multi-select — the API wants an array, and String() on one produces a
    // comma-joined string it rejects.
    discussion_reason__c: [args.reason],
    // The object requires a warning level on every write, so non-warning types
    // carry a placeholder rather than null.
    warning_level__c: args.type === "Warning" ? args.warningLevel : "--",
    status__c: "Draft",
    submission_attestation__c: CREATE_ATTESTATION,
    submission_attestation_confirmation__c: true,
    create_via_app__c: true,
    submit__c: false,
    submit_via_app__c: false,
    request_approval__c: false,
    submitted_by__c: args.submittedBy || null, 
    last_changed_by__c: args.changedBy || null, 
  };

  const res = await fetchWithTimeout(
    `${API_BASE_URL}/custom-objects/${encodeURIComponent(apiName)}/records/`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    throw new Error(`create ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }

  // The create response is an envelope: { breaking_errors, data, write_errors }.
  const envelope = (await res.json()) as Record<string, any>;
  return toRecordHeader(envelope?.data ?? envelope);
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function onRipplingEvent(
  event: FunctionEvent,
  context: FunctionContext
): Promise<FunctionResponse> {
  const params = (event.parameters ?? {}) as Record<string, any>;
  const action = params.action as string | undefined;

  if (action === "init") {
    return new FunctionResponse({
      body: { spec: JSON.stringify(buildSpec(context)) },
      statusCode: 200,
      headers: {},
      message: "",
    });
  }

  /** Every path on an object, flattened. Temporary — for inspecting context. */
  const paths = (obj: any, prefix = "", depth = 0): string[] => {
    if (depth > 4 || obj === null || typeof obj !== "object") return [];
    const out: string[] = [];
    for (const k of Object.keys(obj)) {
      const at = prefix ? `${prefix}.${k}` : k;
      const v = (obj as any)[k];
      const t = typeof v;
      if (v === null) out.push(`${at}=null`);
      else if (t === "object") {
        out.push(`${at}{${Array.isArray(v) ? "[]" : ""}}`);
        out.push(...paths(v, at, depth + 1));
      } else if (t === "function") out.push(`${at}()`);
      else out.push(`${at}=${String(v).slice(0, 60)}`);
    }
    return out;
  };

  const rawToken = context.settings["api_token_kv_api_token_1"];
  const rawApiName = context.settings["api_name_obj_performance_discussion"];
  const token = String(rawToken ?? "");
  const apiName = String(rawApiName ?? "");
  const recordId = String(params.recordId ?? "");
  // The viewers own role id
  const currentRoleId = String((context as any)?.function?.role_id ?? "");

  if (action === "loadEmployee") {
    const startedAt = Date.now();
    const empId = params.empId as string | undefined;

    if (!rawToken || !rawApiName) {
      return new FunctionResponse({
        body: {
          ...emptyPanel,
          userMessage: `This app isn't set up correctly. If the problem persists, reach out to ${SUPPORT_CONTACT}.`,
        } as unknown as Record<string, unknown>,
        statusCode: 200,
        headers: {},
        message: `Missing setting(s). token set: ${Boolean(rawToken)}`,
      });
    }

    if (!empId || !/^[a-f0-9]{24}$/i.test(empId)) {
      return new FunctionResponse({
        body: {
          ...emptyPanel,
          userMessage: "Select a team member first.",
        } as unknown as Record<string, unknown>,
        statusCode: 200,
        headers: {},
        message: `Missing or malformed team member role ID: ${empId}`,
      });
    }

    if (currentRoleId && currentRoleId === empId) {
      return new FunctionResponse({
        body: {
          ...emptyPanel,
          userMessage:
            "Select the related team member for this discussion. You cannot create or edit discussions for yourself.",
        } as unknown as Record<string, unknown>,
        statusCode: 200,
        headers: {},
        message: "Self-selection blocked",
      });
    }

    try {
      const { panel, accessWhy, viewerRaw } = await loadEmployee(empId, currentRoleId, token, apiName);
      return new FunctionResponse({
        body: panel as unknown as Record<string, unknown>,
        statusCode: 200,
        headers: {},
        message: `Loaded ${empId} in ${Date.now() - startedAt}ms} :: access=${accessWhy} :: viewerRaw=${viewerRaw.slice(0, 300)}`,
      });
    } catch (error: any) {
      return new FunctionResponse({
        body: {
          ...emptyPanel,
          userMessage: "Something went wrong loading team member details. Click 'Select' or 'Start Over' to try again.",
        } as unknown as Record<string, unknown>,
        statusCode: 200,
        headers: {},
        message: `Load failed for ${empId}: ${error?.message ?? String(error)}`,
      });
    }
  }

  if (action === "loadDepartments") {
    try {
      const { headers, fetchWithTimeout } = makeFetch(token);
      const res = await fetchWithTimeout(`${API_BASE_URL}/departments`, {
        method: "GET",
        headers,
      });
      if (!res.ok) throw new Error(`departments ${res.status}`);

      const data = (await res.json()) as { results?: any[] } | any[];
      const rows = Array.isArray(data) ? data : data.results ?? [];

      // Two passes: the parent's name is only reachable once every department
      // is in hand, and sub-department names repeat across parents.
      const byId = new Map<string, any>();
      for (const d of rows) if (d?.id) byId.set(String(d.id), d);

      const options: DeptOption[] = rows
        .map((d: any) => {
          const name = String(d.name ?? "");
          const parent = d.parent_id ? byId.get(String(d.parent_id)) : null;
          const parentName = String(parent?.name ?? "");
          return {
            label: parentName ? `${parentName} > ${name}` : name,
            value: String(d.id ?? ""),
          };
        })
        .filter((o) => o.label && o.value)
        .sort((a, b) => a.label.localeCompare(b.label));

      return new FunctionResponse({
        body: options as unknown as Record<string, unknown>,
        statusCode: 200,
        headers: {},
        message: `loadDepartments ok: ${options.length}`,
      });
    } catch (e: any) {
      return new FunctionResponse({
        body: [] as unknown as Record<string, unknown>,
        statusCode: 200,
        headers: {},
        message: `loadDepartments failed: ${e?.message ?? String(e)}`,
      });
    }
  }

  if (action === "loadByDepartment") {
    const startedAt = Date.now();
    const deptId = String(params.departmentId ?? "");
    const options = Array.isArray(params.options) ? params.options : [];
    const timeframe = String(params.timeframe ?? "1w");
    const statuses: string[] = Array.isArray(params.statuses)
      ? params.statuses
      : [];

    const back = (rows: DeptRow[], message: string, log: string) =>
      new FunctionResponse({
        body: {
          options,
          hasOptions: String(params.hasOptions ?? ""),
          selected: deptId,
          timeframe,
          statuses,
          rows,
          message,
        } as unknown as Record<string, unknown>,
        statusCode: 200,
        headers: {},
        message: log,
      });

    if (!deptId) return back([], "Select a department.", "no department");

    const days = TIMEFRAMES.find((t) => t.value === timeframe)?.days ?? 7;
    const floor = addDays(new Date().toISOString().slice(0, 10), -days);

    try {
      const { headers, fetchWithTimeout } = makeFetch(token);
      const endpoint = `${API_BASE_URL}/custom-objects/${encodeURIComponent(
        apiName
      )}/records/query/`;

      // The date floor goes in the query so the department's whole history
      // isn't paged through. Status is filtered below, since Draft also
      // covers records where the field was never set.
      const query = `owner_role.department.id = '${deptId}' and created_date__c >= '${floor}'`;

      const raw: Array<Record<string, any>> = [];
      let cursor: string | undefined = undefined;
      let pages = 0;

      do {
        const b: Record<string, unknown> = { query, limit: DEPT_PAGE_LIMIT };
        if (cursor) b.cursor = cursor;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), DEPT_TIMEOUT_MS);
        let res: Response;
        try {
          res = await fetch(endpoint, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify(b),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timer);
        }
        if (!res.ok) throw new Error(`query ${res.status}`);

        const data = (await res.json()) as {
          results?: any[];
          cursor?: string | null;
        };
        for (const row of data.results ?? []) raw.push(row);

        pages += 1;
        const next = data.cursor ?? undefined;
        if (next && next === cursor) break;
        cursor = next;
      } while (cursor && Date.now() - startedAt < DEPT_BUDGET_MS);

      const truncated = Boolean(cursor);

      // An unset status counts as Draft, which the query cannot express.
      const wanted = new Set(statuses);
      const kept =
        statuses.length === 0
          ? raw
          : raw.filter((r) => wanted.has(String(r.status__c || "Draft")));

      const rows: DeptRow[] = kept
        .sort((a, b) =>
          String(b.created_date__c ?? "").localeCompare(
            String(a.created_date__c ?? "")
          )
        )
        .map((r) => ({
          ...toHistoryRow(r, false, false),
          employeeName: String(r.owner_role?.display_value ?? EMPTY),
        }));

      return back(
        rows,
        truncated
          ? `${rows.length} shown. More exist — narrow the timeframe.`
          : `${rows.length} discussion${rows.length === 1 ? "" : "s"}.`,
        `loadByDepartment ok: ${rows.length}/${raw.length} over ${pages} page(s) in ${
          Date.now() - startedAt
        }ms`
      );
    } catch (e: any) {
      return back(
        [],
        `Couldn't load discussions. If the problem persists, reach out to ${SUPPORT_CONTACT}.`,
        `loadByDepartment failed: ${e?.message ?? String(e)}`
      );
    }
  }

  if (action === "createDiscussion") {
    const startedAt = Date.now();
    if (!rawToken || !rawApiName || !params.empId || !params.type || !params.reason) {
      return new FunctionResponse({
        body: emptyRecord as unknown as Record<string, unknown>,
        statusCode: 200,
        headers: {},
        message: "Missing required values for create",
      });
    }

    try {
      const created = await createDiscussion(
        {
          empId: String(params.empId),
          type: String(params.type),
          reason: String(params.reason),
          warningLevel: String(params.warningLevel ?? "--"),
          submittedBy: String(currentRoleId ?? ""),
          changedBy: String(currentRoleId ?? ""),
        },
        token,
        apiName
      );
      return new FunctionResponse({
        body: created as unknown as Record<string, unknown>,
        statusCode: 200,
        headers: {},
        message: `Created ${created.name} in ${Date.now() - startedAt}ms`,
      });
    } catch (error: any) {
      return new FunctionResponse({
        body: emptyRecord as unknown as Record<string, unknown>,
        statusCode: 200,
        headers: {},
        message: `Create failed: ${error?.message ?? String(error)}`,
      });
    }
  }

  if (action === "loadForEdit") {
    try {
      const record = await getRecord(recordId, token, apiName);
      return new FunctionResponse({
        body: toRecordHeader(record) as unknown as Record<string, unknown>,
        statusCode: 200,
        headers: {},
        message: `loadForEdit ok for ${recordId}`,
      });
    } catch (e: any) {
      return new FunctionResponse({
        body: emptyRecord as unknown as Record<string, unknown>,
        statusCode: 200,
        headers: {},
        message: `loadForEdit failed: ${e?.message ?? String(e)}`,
      });
    }
  }

  if (action === "loadEditDetails") {
    try {
      const record = await getRecord(recordId, token, apiName);
      return new FunctionResponse({
        body: toDetailsState(record) as unknown as Record<string, unknown>,
        statusCode: 200,
        headers: {},
        message: `loadEditDetails ok for ${recordId}`,
      });
    } catch (e: any) {
      return new FunctionResponse({
        body: emptyDetails as unknown as Record<string, unknown>,
        statusCode: 200,
        headers: {},
        message: `loadEditDetails failed: ${e?.message ?? String(e)}`,
      });
    }
  }

  if (action === "saveFeedback") {
    const ceiling = dateCeiling(
      String(params.createdDate ?? ""),
      String(params.communicationDate ?? "")
    );

    let error = "";
    if (!params.feedbackDate) {
      error = "Date of Feedback is required.";
    }
    if (!error) {
      error = checkDateCeiling(
        String(params.feedbackDate ?? ""),
        "Date of Feedback",
        ceiling
      );
    }
    if (!error) {
      error = checkLongText(
        String(params.feedbackDetails ?? ""),
        "Feedback Details",
        9,
        1000
      );
    }
    if (error) return rejected(error);

    try {
      await patchRecord(
        recordId,
        {
          date_of_feedback__c: params.feedbackDate || null,
          feedback_details_00__c: String(params.feedbackDetails ?? ""),
          last_changed_by__c: currentRoleId || null,
        },
        token,
        apiName
      );
      return ok(`saveFeedback ok for ${recordId}`);
    } catch (e: any) {
      return failed(`saveFeedback failed: ${e?.message ?? String(e)}`);
    }
  }

  if (action === "saveIncident") {
    const type = String(params.type ?? "");
    const reason = String(params.reason ?? "");
    const isAbandonment = reason.includes("Job Abandonment");
    const needsDetails = type === "Warning" || type === "Termination Notice";
    const ceiling = dateCeiling(
      String(params.createdDate ?? ""),
      String(params.communicationDate ?? "")
    );

    let error = "";
    if (isAbandonment) {
      const d1 = String(params.ncns1 ?? "");
      const d2 = String(params.ncns2 ?? "");
      const d3 = String(params.ncns3 ?? "");

      if (!d1 || !d2 || !d3) {
        error = "All three NCNS dates are required for Job Abandonment.";
      } else if (!(d1 < d2)) {
        error = "NCNS - Date 1 must be at least one day before NCNS - Date 2.";
      } else if (!(d2 < d3)) {
        error = "NCNS - Date 2 must be at least one day before NCNS - Date 3.";
      } else {
        error =
          checkDateCeiling(d1, "NCNS - Date 1", ceiling) ||
          checkDateCeiling(d2, "NCNS - Date 2", ceiling) ||
          checkDateCeiling(d3, "NCNS - Date 3", ceiling);
      }
    } else if (!params.incidentDate) {
      error = "Date of Incident is required.";
    } else {
      error = checkDateCeiling(
        String(params.incidentDate),
        "Date of Incident",
        ceiling
      );
    }

    if (!error && needsDetails) {
      error = checkLongText(
        String(params.incidentDetails ?? ""),
        "Incident Details",
        9,
        2000
      );
    }
    if (error) return rejected(error);

    try {
      await patchRecord(
        recordId,
        {
          ncns_date_1__c: isAbandonment ? params.ncns1 : null,
          ncns_date_2__c: isAbandonment ? params.ncns2 : null,
          ncns_date_3__c: isAbandonment ? params.ncns3 : null,
          // Job Abandonment takes its incident date from the third NCNS date.
          date_of_incident__c: isAbandonment
            ? params.ncns3
            : params.incidentDate || null,
          description_of_incident_00__c: String(params.incidentDetails ?? ""),
          last_changed_by__c: currentRoleId || null,
        },
        token,
        apiName
      );
      return ok(`saveIncident ok for ${recordId}`);
    } catch (e: any) {
      return failed(`saveIncident failed: ${e?.message ?? String(e)}`);
    }
  }

  if (action === "savePriorMatters") {
    const include = isFlagTrue(params.include);
    // Each selection is already the formatted line, so it stores directly.
    const selected: string[] = Array.isArray(params.selected)
      ? params.selected
      : [];

    if (include && selected.length === 0) {
      return rejected("Select at least one prior matter, or turn the switch off.");
    }

    try {
      await patchRecord(
        recordId,
        {
          show_violations_and_occurrences__c: include,
          prior_matters_00__c: include ? selected.join("\n") : "",
          last_changed_by__c: currentRoleId || null,
        },
        token,
        apiName
      );
      return ok(`savePriorMatters ok for ${recordId}`);
    } catch (e: any) {
      return failed(`savePriorMatters failed: ${e?.message ?? String(e)}`);
    }
  }

  if (action === "saveAddtlInfo") {
    const include = isFlagTrue(params.include);
    const text = String(params.addtlContext ?? "");

    if (include) {
      const error = checkLongText(text, "Additional Context", 6, 1000);
      if (error) return rejected(error);
    }

    try {
      await patchRecord(
        recordId,
        {
          show_additional_context__c: include,
          additional_context_00__c: include ? text : "",
          last_changed_by__c: currentRoleId || null,
        },
        token,
        apiName
      );
      return ok(`saveAddtlInfo ok for ${recordId}`);
    } catch (e: any) {
      return failed(`saveAddtlInfo failed: ${e?.message ?? String(e)}`);
    }
  }

  if (action === "saveActionPlan") {
    const include = isFlagTrue(params.include);
    const text = String(params.actionPlan ?? "");

    if (include) {
      const error = checkLongText(text, "Action Plan", 6, 1000);
      if (error) return rejected(error);
    }

    try {
      await patchRecord(
        recordId,
        {
          show_action_plan__c: include,
          action_plan_00__c: include ? text : "",
          last_changed_by__c: currentRoleId || null,
        },
        token,
        apiName
      );
      return ok(`saveActionPlan ok for ${recordId}`);
    } catch (e: any) {
      return failed(`saveActionPlan failed: ${e?.message ?? String(e)}`);
    }
  }

  if (action === "saveComms") {
    const include = isFlagTrue(params.include);
    const method = String(params.commMethod ?? "");
    const recordings = Array.isArray(params.commRecording)
      ? params.commRecording
      : [];

    let error = "";
    if (include) {
      if (!params.commDate) {
        error = "Communication Date is required.";
      } else {
        error = checkDateCeiling(
          String(params.commDate),
          "Communication Date",
          String(params.createdDate ?? "").slice(0, 10)
        );
      }
      // A recording is the only proof for methods with no written trail.
      if (
        !error &&
        (method === "Phone Call" || method === "Voice Mail") &&
        recordings.length === 0
      ) {
        error = `A recording is required when the communication method is ${method}.`;
      }
    }
    if (error) return rejected(error);

    try {
      // The two file fields are not written here: the inputs hold base64 data
      // URLs, and whether the record's attachment fields accept that form is
      // unconfirmed. They are validated above but stored separately.
      await patchRecord(
        recordId,
        {
          show_communication_details__c: include,
          communication_date__c: include ? params.commDate || null : null,
          communication_method__c: include ? method || null : null,
          witness__c: include ? params.witness || null : null,
          last_changed_by__c: currentRoleId || null,
        },
        token,
        apiName
      );
      return ok(`saveComms ok for ${recordId}`);
    } catch (e: any) {
      return failed(`saveComms failed: ${e?.message ?? String(e)}`);
    }
  }

  if (action === "saveDiscussion") {
    const type = String(params.type ?? "");
    const attestation =
      type === "Termination Notice"
        ? SUBMIT_ATTESTATION_TERMINATION
        : SUBMIT_ATTESTATION_STANDARD;

    // Records the attestation and nothing else. The submit flags are left
    // alone so saving after a submit cannot walk one back.
    const fields = {
      submission_attestation__c: attestation,
      submission_attestation_confirmation__c: true,
      create_via_app__c: true,
      warning_level__c: type === "Warning" ? String(params.warningLevel ?? "--") : "--",
      last_changed_by__c: currentRoleId || null,
    };

    try {
      await patchRecord(recordId, fields, token, apiName);
      return new FunctionResponse({
        body: {
          checked: true,
          error: "",
          result: "Saved. Submit when you're ready.",
          showSnack: false, 
        } as unknown as Record<string, unknown>,
        statusCode: 200,
        headers: {},
        message: `saveDiscussion ok for ${recordId}`,
      });
    } catch (e: any) {
      return new FunctionResponse({
        body: {
          checked: true,
          error: `Couldn't save. If the problem persists, reach out to ${SUPPORT_CONTACT}.`,
          result: "",
          showSnack: false
        } as unknown as Record<string, unknown>,
        statusCode: 200,
        headers: {},
        message: `saveDiscussion failed: ${e?.message ?? String(e)} :: sent=${JSON.stringify(fields)}`,
      });
    }
  }

  if (action === "submitDiscussion") {

    const type = String(params.type ?? "");
    const attestation =
      type === "Termination Notice"
        ? SUBMIT_ATTESTATION_TERMINATION
        : SUBMIT_ATTESTATION_STANDARD;
    const fields = {
        submission_attestation__c: attestation,
        submission_attestation_confirmation__c: true,
        create_via_app__c: true,
        warning_level__c: type === "Warning" ? String(params.warningLevel ?? "--") : "--",
        submit__c: true,
        submit_via_app__c: true,
        request_approval__c: true,
        submitted_by__c: currentRoleId || null,
        last_changed_by__c: currentRoleId || null,
        status__c: "Pending Approval"
      };

    try {
        await patchRecord(recordId, fields, token, apiName);

      return new FunctionResponse({
        body: {
          checked: true,
          error: "",
          result: "Submitted for approval.", 
          showSnack: true
        } as unknown as Record<string, unknown>,
        statusCode: 200,
        headers: {},
        message: `submitDiscussion ok for ${recordId}`,
      });
    } catch (e: any) {
      return new FunctionResponse({
        body: {
          checked: true,
          error: `Couldn't submit. If the problem persists, reach out to ${SUPPORT_CONTACT}.`,
          result: "",
          showSnack: false,
          showSnackError: true,
        } as unknown as Record<string, unknown>,
        statusCode: 500,
        headers: {},
        message: `submitDiscussion failed: ${e?.message ?? String(e)} :: sent=${JSON.stringify(fields)}`,
      });
    }
  }

  if (action === "cancelDiscussion") {
    const fields = {
      submit_via_app__c: false,
      submit__c: false,
      request_approval__c: false,
      approve__c: false,
      send_back__c: false,
      cancel__c: true,
      status__c: "Canceled",
      last_changed_by__c: currentRoleId || null,
    };

    try {
      await patchRecord(recordId, fields, token, apiName);
      return new FunctionResponse({
        body: "Discussion canceled. Reload to move it to the Canceled tab." as unknown as Record<string, unknown>,
        statusCode: 200,
        headers: {},
        message: `cancelDiscussion ok for ${recordId}`,
      });
    } catch (e: any) {
      return new FunctionResponse({
        body: `Couldn't cancel the discussion. If the problem persists, reach out to ${SUPPORT_CONTACT}.` as unknown as Record<string, unknown>,
        statusCode: 200,
        headers: {},
        message: `cancelDiscussion failed: ${e?.message ?? String(e)} :: sent=${JSON.stringify(fields)}`,
      });
    }
  }

  if (action === "approveDiscussion") {
    // The button is hidden for everyone else, but the gate has to hold here
    // as well: the function is callable without going through the page.
    const { getJson } = makeFetch(token);
    const me = currentRoleId
      ? await getJson(`${API_BASE_URL}/workers/${encodeURIComponent(currentRoleId)}?expand=department`)
      : null;

    if (String(me?.department?.name ?? "") !== "People Operations") {
      return new FunctionResponse({
        body: "Only People Operations can approve a discussion." as unknown as Record<string, unknown>,
        statusCode: 200,
        headers: {},
        message: `approveDiscussion blocked for ${currentRoleId}`,
      });
    }

    const fields = {
      submit_via_app__c: false,
      submit__c: true,
      approve__c: true,
      send_back__c: false,
      cancel__c: false,
      status__c: "Approved",
      last_changed_by__c: currentRoleId || null,
    };

    try {
      await patchRecord(recordId, fields, token, apiName);
      return new FunctionResponse({
        body: "Discussion approved. Reload to see it move." as unknown as Record<string, unknown>,
        statusCode: 200,
        headers: {},
        message: `approveDiscussion ok for ${recordId}`,
      });
    } catch (e: any) {
      return new FunctionResponse({
        body: `Couldn't approve the discussion. If the problem persists, reach out to ${SUPPORT_CONTACT}.` as unknown as Record<string, unknown>,
        statusCode: 200,
        headers: {},
        message: `approveDiscussion failed: ${e?.message ?? String(e)} :: sent=${JSON.stringify(fields)}`,
      });
    }
  }

  if (action === "confirmDocument") {
    try {
      await patchRecord(
        recordId,
        { 
          create_discussion_document__c: true, 
          discussion_document_created_by__c: currentRoleId || null,
        },
        token,
        apiName
      );

      // The flag is a trigger the workflow resets after generating the
      // document, so confirming twice would generate it twice.
      return new FunctionResponse({
        body: "Document requested. It will be generated shortly." as unknown as Record<
          string,
          unknown
        >,
        statusCode: 200,
        headers: {},
        message: `confirmDocument ok for ${recordId}`,
      });
    } catch (e: any) {
      return new FunctionResponse({
        body: `Couldn't request the document. If the problem persists, reach out to ${SUPPORT_CONTACT}.` as unknown as Record<
          string,
          unknown
        >,
        statusCode: 200,
        headers: {},
        message: `confirmDocument failed: ${e?.message ?? String(e)}`,
      });
    }
  }

  return new FunctionResponse({
    body: {},
    statusCode: 400,
    headers: {},
    message: "Unknown action",
  });
}
