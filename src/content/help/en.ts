import type { HelpPack } from "./types";

/** The reference version. Written against what the product actually does. */
export const en: HelpPack = {
  worker: {
    title: "Your week, and your hours",
    audience: "For anyone on site.",
    sections: [
      {
        heading: "Clocking in",
        body: [
          "Open the clock, pick the site if it is not already filled in from your agenda, and press start. Press stop when you finish. That is the whole thing, and it is meant to be done with one hand.",
          "Save the clock page to your phone's home screen and it opens straight onto the button, without the browser around it.",
          "Your phone may ask to share its position. It is used once, on the spot, to answer one question — is this clock-in at the work location? — and then thrown away. STRATON does not keep where you are, and there is no column in the database that could.",
        ],
      },
      {
        heading: "Your agenda",
        body: [
          "The week shows the jobs you are on, with the hours and the address. If a job moves or is cancelled you get a notification — that is the channel that reaches you in time.",
          "You can also put your week in your phone's calendar: the agenda has a subscription link for that. It updates on its own, but not to the minute — the calendar app decides when to fetch, sometimes hours later. A last-minute change is confirmed in the app, never in the calendar.",
          "That link is a key. Anyone holding it can read your schedule without logging in, so send it only to yourself, and revoke it if it goes astray. The screen shows when it was last read, which is how you would notice.",
        ],
      },
      {
        heading: "Saying when you are not available",
        body: [
          "Declare a holiday, a training day or an absence in Availability, and your supervisor sees the dates when planning.",
          "Two things worth knowing. It warns, it does not block: a supervisor can still book you, and will be told there is a conflict — sometimes the holiday is cancelled, sometimes you volunteered, and the system should not decide that. And the note you write is not shown to colleagues; they see the dates, not the reason.",
        ],
      },
      {
        heading: "Swapping a shift",
        body: [
          "On any job you are on, ask a colleague to take it. They have to accept before anyone else is involved, and only then can a supervisor approve it. Until the supervisor approves, the job is still yours.",
          "The colleague goes first on purpose: without that, anyone could hand their Saturday to someone who never agreed to take it.",
        ],
      },
      {
        heading: "Your timesheet",
        body: [
          "Hours you clock become a weekly timesheet. You submit it; your supervisor or the office approves it. Once approved it is the record that goes to payroll, so check the week before you send it.",
        ],
      },
    ],
  },

  supervisor: {
    title: "Planning the week",
    audience: "For team leaders and site supervisors.",
    sections: [
      {
        heading: "Booking work",
        body: [
          "Create a job in the agenda: a title, the hours, the site, and who is on it. Everyone booked is notified.",
          "You can book people one by one or book a whole team.",
        ],
      },
      {
        heading: "Booking a team freezes who was in it",
        body: [
          "This is the rule people find surprising, and it is deliberate. Booking a team writes down the people who are in it at that moment. Somebody who leaves the team tomorrow stays on the job they were booked for yesterday.",
          "Work out membership live instead and the crew of a finished job changes retroactively, which means the timesheet stops agreeing with who was actually on site. For Belgian record-keeping that is not acceptable — there has to be a record of who was assigned on the day.",
        ],
      },
      {
        heading: "Availability warns, it does not block",
        body: [
          "Booking somebody who declared themselves away is allowed, and you are told. A supervisor who knows something the system does not should never be stopped by it; what must not happen is booking blind.",
          "You see the dates and the type. You do not see the note somebody wrote about why.",
        ],
      },
      {
        heading: "Moving a job",
        body: [
          "Use Reschedule on the job itself. Only what actually changed is announced: saving without touching anything notifies nobody, and a time change and a site change are different notifications because they are different problems for the person receiving them.",
          "Availability is re-checked against the new dates. Somebody free at 7:30 may not be free at 9:00.",
        ],
      },
      {
        heading: "Shift swaps",
        body: [
          "A worker asks a colleague; the colleague accepts; then it reaches you. Approve is only offered once the colleague has accepted — approving a transfer that one side knows nothing about is how somebody finds out on the day.",
          "You can refuse at any point. Approving is the moment the job actually changes hands, and both people are told.",
        ],
      },
      {
        heading: "Field reports",
        body: [
          "Reports are filled in against a template your company wrote. They go from draft to submitted, and you either approve them or ask for changes. The history of who did what stays on the report.",
        ],
      },
    ],
  },

  manager: {
    title: "Running the company",
    audience: "For owners, administrators and the office.",
    sections: [
      {
        heading: "Setting up",
        body: [
          "Settings holds the company's own record — language, time zone, default break — and the permission map that decides what each role may do.",
          "Add your people under People. An invitation is e-mailed; they set their own password. Somebody who already has a STRATON login through another company gets no e-mail, and that is not an error — they get the link instead, which you can send however you normally talk to them.",
        ],
      },
      {
        heading: "Clients: a company or a person",
        body: [
          "A client can be a registered company or a private person, and the choice comes first because it changes what is asked. A company is searched in the Belgian register by name, and its VAT number and registered office come from there. A person has none of that, and is not asked for it.",
          "This matters beyond the form: billing has to know which it is, because the VAT treatment is not the same.",
        ],
      },
      {
        heading: "Inviting another company",
        body: [
          "A subcontractor with no STRATON account can be invited by e-mail. The link in that invitation lets whoever holds it create a company linked to yours, so it is a credential: send it to the company, not to a group chat.",
          "It expires, it works once, and you can revoke it.",
        ],
      },
      {
        heading: "Delegation is not collaboration",
        body: [
          "These are two different things and the difference is who consented. Delegating a job to another company shows the contractor the state of the work — not the people doing it. Inviting a company onto a site shows the state and the crew, because that company accepted the invitation.",
          "A chain can be five levels deep and cannot loop back on itself. Each company sees one level: who gave them the work, and who they gave it to. Not the whole chain.",
        ],
      },
      {
        heading: "From the clock to the payslip",
        body: [
          "Hours become weekly timesheets, timesheets are approved, and approved hours feed the payroll period. The worked-hours report exports as a CSV, because an accountant needs a file rather than a screen.",
          "The dashboard flags what needs attention: hours that diverge from what was planned, people with no record today, timesheets waiting on approval.",
        ],
      },
      {
        heading: "What STRATON does not do",
        body: [
          "It records what people enter. It does not verify that a working-time record is true, and it does not replace your own obligations to declare and to keep records — Dimona and the electronic presence registration on large sites are not part of the product.",
          "The withholding-obligation check (article 30bis) links to the official portal. It tells you where to look; it does not answer for you.",
        ],
      },
    ],
  },

  partner: {
    title: "Working on somebody else's site",
    audience: "For a company invited onto a site.",
    sections: [
      {
        heading: "Accepting the invitation",
        body: [
          "The link you were sent creates your company on STRATON, or connects the one you already have. Accepting is the consent — there is no second confirmation, and it is what makes the site visible to you.",
        ],
      },
      {
        heading: "What you see, and what you do not",
        body: [
          "You see the site you were invited onto, and your own people on it. You do not see the other companies' crews, the client's other sites, their client list, or anything about their staff.",
          "The boundary is enforced by the database, per row, not by the screens — which is why it holds even where an interface might forget it.",
        ],
      },
      {
        heading: "Putting your people on it",
        body: [
          "Once you have accepted, allocate your own workers to the site. They clock in against it like any other job, and their hours are yours: they appear in your timesheets, not in the contractor's.",
        ],
      },
      {
        heading: "What the contractor sees of you",
        body: [
          "If the work was delegated to you, they see its state — planned, in progress, done — and not who you sent. If they invited you onto the site, they see your crew there too, because that is what you accepted.",
          "If that distinction matters to you, it is worth asking which of the two you were given before you accept.",
        ],
      },
    ],
  },
};
