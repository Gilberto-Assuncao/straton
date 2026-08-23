import { LEGAL, type LegalPack } from "./types";

/**
 * The reference version.
 *
 * Written against what the code actually does, not against a template. Every
 * factual claim below is checkable in this repository — which is the only
 * reason a privacy notice is worth reading.
 */
export const en: LegalPack = {
  privacy: {
    title: "Privacy notice",
    summary: `How STRATON handles personal data, and what it deliberately does not collect.`,
    sections: [
      {
        heading: "Who this is about",
        body: [
          `STRATON is a workforce management platform for field companies: clocking in and out, work locations, schedules, timesheets and payroll periods. It is operated by ${LEGAL.operator}, which can be reached at ${LEGAL.contactEmail}.`,
          `Two different relationships are covered here, and they are not the same in law. When a company signs up and uses STRATON to manage its own people, that company decides what is recorded about its workers and why: it is the controller, and STRATON acts on its instructions as a processor. Separately, for the account itself — who registered, the address we write to, what was asked of support — STRATON is the controller.`,
          `A worker who wants their own record corrected or explained should ask their employer first. Their employer decides; we act on that decision.`,
        ],
      },
      {
        heading: "What is recorded",
        body: [
          `Account and identity: name, e-mail address, telephone number if given, preferred language and time zone, and the profile picture if one is uploaded.`,
          `Employment within a company on the platform: job title and function, the roles that decide what the person may see and do, team membership, and any professional certificates recorded — for example a VCA or BA5 attestation, with its expiry date.`,
          `Work: the moment a shift is started and ended, break minutes, notes typed by the person, which work location and which subdivision of it, and which task or assignment the hours belong to. From those, the timesheets, their approval status, and the payroll consolidations built on them.`,
          `Scheduling: assignments a person is booked onto, declared availability and absences, shift swaps proposed and approved, and the notifications sent about all of it.`,
          `Housekeeping: an audit trail of significant changes, and technical logs. The logs carry an event name and identifiers, never the contents of a record — the fields that may be logged are a fixed list in the code.`,
        ],
      },
      {
        heading: "Location: what is not recorded",
        body: [
          `STRATON does not store where a worker is. This is the part most systems of this kind get wrong, so it is stated precisely.`,
          `When someone clocks in, their phone may offer its position. That position is used once, in the moment, to answer a single question — is this clock-in at the work location? — and is then discarded. What is written to the database is the answer: yes, no, or unknown, together with a distance rounded to the nearest ten metres. There is no column for a worker's coordinates, and the columns that once existed were deleted.`,
          `The distinction matters. A coordinate does not say "at the Le Parc site"; it says where this person was, at that minute. Clock in from home, from a café, from a doctor's waiting room, and it would be on the record forever. The company's legitimate question is which site the hours belong to, and answering it does not require keeping a trail.`,
          `Work locations themselves do have coordinates. Those belong to the company — a site is entered once, with its address — and they are what the map is drawn from.`,
        ],
      },
      {
        heading: "Why it is held",
        body: [
          `To run the service the employer asked for: recording hours, planning work, producing timesheets and payroll figures, and telling people what has changed about their week.`,
          `Because an employer has obligations of its own. Records of hours worked are kept because employment and social security law requires an employer to be able to produce them.`,
          `To keep the platform working and secure: diagnosing faults, preventing abuse, and being able to reconstruct who changed what.`,
          `For an employee, consent is generally not the basis for any of this, and deliberately so: consent given by a worker to their employer is weak, because the relationship is not one between equals. What is done is what is necessary to perform the employment relationship and to comply with the law.`,
        ],
      },
      {
        heading: "Who can see it",
        body: [
          `Inside a company: what someone sees depends on their role. A worker sees their own hours, their own schedule and the sites they are on. A supervisor sees the team they are responsible for. An administrator or payroll role sees the company's records. These limits are enforced by the database itself, per row, not only by the screens.`,
          `Between companies: nothing crosses. Where two companies work together on the same site as partners or subcontractors, each sees only what that arrangement requires.`,
          `${LEGAL.operator}: staff can reach customer data only when it is necessary to run or repair the service, or when the customer asks for help.`,
        ],
      },
      {
        heading: "Who else processes it",
        body: [
          `The platform runs on services provided by others, each acting on our instructions: Supabase for the database, authentication and e-mail delivery; Vercel for hosting the application; and MapTiler for map imagery, which receives a request for the area being looked at when a map is opened, and no information about who is looking at it.`,
          `A current list of these providers and of where they process data is available from ${LEGAL.contactEmail}.`,
          `One case is chosen by the worker rather than by us. A worker may generate a personal calendar subscription link for their own schedule. If they add it to Google Calendar, Outlook or another calendar, their schedule — the job title, the hours, the site address — is then read by that provider under that provider's own terms. Instructions and notes are never included in that feed. The link can be revoked at any time, and the platform shows when it was last read, which is what makes a leaked link visible to the person it belongs to.`,
        ],
      },
      {
        heading: "How long it is kept",
        body: [
          `Working-time records are kept for as long as the employer needs them to meet its own legal obligations, which for payroll and social-security purposes is measured in years rather than months.`,
          `Account data is kept while the account is in use. When a company leaves the platform, its data is deleted or returned on request.`,
          `A revoked calendar subscription keeps only the fact that it existed and the digest of its address — never the address itself — so that a link which leaked can still be investigated.`,
        ],
      },
      {
        heading: "Your rights",
        body: [
          `Anyone whose data is held may ask for a copy of it, ask for it to be corrected, ask for it to be deleted, ask for its use to be restricted, object to its use, and ask to receive it in a portable form.`,
          `For anything recorded by an employer through STRATON, the request goes to that employer, who decides it. For the account itself, write to ${LEGAL.contactEmail}.`,
          `Anyone who believes their data is being handled wrongly may complain to the Belgian Data Protection Authority — Gegevensbeschermingsautoriteit / Autorité de protection des données, Rue de la Presse 35, 1000 Brussels — or to the supervisory authority of the country they live in.`,
        ],
      },
      {
        heading: "Changes",
        body: [
          `The date at the top of this page is the date of the last substantive change. Where a change affects what is collected or why, customers are told before it takes effect rather than after.`,
        ],
      },
    ],
  },

  terms: {
    title: "Terms of service",
    summary: `The agreement between ${LEGAL.operator} and a company using STRATON.`,
    sections: [
      {
        heading: "What this covers",
        body: [
          `These terms govern the use of STRATON, operated by ${LEGAL.operator}. They apply to the company that opens an account and to everyone that company gives access to.`,
          `Where a separate signed agreement exists between us and a customer, that agreement takes precedence over anything written here.`,
        ],
      },
      {
        heading: "Accounts and access",
        body: [
          `A company account is opened by someone with authority to bind that company. That company decides who else has access and with what role, and it is responsible for what those people do with it.`,
          `Access credentials are personal. Sharing a login between people makes the record of who did what worthless, which is the one thing a working-time system cannot afford to lose.`,
        ],
      },
      {
        heading: "What you may not do",
        body: [
          `Use the platform to record hours or movements of people who have not been told they are being recorded; attempt to reach another company's data; probe or attack the service, except as described under responsible disclosure on the security page; or resell access without a written agreement.`,
        ],
      },
      {
        heading: "Your data stays yours",
        body: [
          `Everything a customer records in STRATON remains that customer's. We use it to provide the service and for nothing else: it is not sold, not shared with other customers, and not used to train anything.`,
          `On request, a customer's data is exported in a usable form or deleted.`,
        ],
      },
      {
        heading: "Availability",
        body: [
          `The service is provided as it stands, and we work to keep it available and correct. No specific uptime is promised in these terms; where a customer needs a commitment on availability or support response, it is agreed separately and in writing.`,
          `Maintenance that requires an interruption is announced in advance where it can be planned.`,
        ],
      },
      {
        heading: "Fees",
        body: [
          `Commercial terms — price, billing period, notice — are agreed in writing with each customer. Where nothing has been agreed, no fee is due and no payment obligation arises from these terms alone.`,
        ],
      },
      {
        heading: "Ending it",
        body: [
          `A customer may stop using the service at any time and ask for their data back or deleted.`,
          `We may suspend an account that is being used in a way that breaks these terms or endangers other customers, and will say why. Suspension is not deletion: data is kept long enough for the customer to retrieve it.`,
        ],
      },
      {
        heading: "Liability",
        body: [
          `Nothing in these terms limits liability for fraud, for wilful misconduct, or for anything that cannot be limited by law — including personal injury.`,
          `Beyond that, and to the extent the law allows, our liability is limited to the fees paid for the service in the twelve months before the event, and we are not liable for indirect or consequential loss.`,
          `STRATON records what its users enter. It does not verify that a working-time record is accurate, and it does not replace the employer's own obligations to declare and to keep records.`,
        ],
      },
      {
        heading: "Changes to these terms",
        body: [
          `Changes are published on this page with a new date. A change that materially affects a customer's rights is communicated before it takes effect.`,
        ],
      },
      {
        heading: "Law and courts",
        body: [
          `Belgian law applies, and the courts of Belgium have jurisdiction.`,
        ],
      },
    ],
  },

  security: {
    title: "Security",
    summary: `How the platform protects the data in it, and how to report a problem.`,
    sections: [
      {
        heading: "Separation between companies",
        body: [
          `Every table in the database enforces row-level security. Which rows a request may read or write is decided by the database from the identity of the person making it — not by the screens, and not by the application code that could be bypassed.`,
          `That separation is not taken on trust. A dedicated job runs on every change, against a database built from scratch, and asks who may touch which row; it currently makes 208 such assertions, and a change that breaks isolation does not reach production.`,
        ],
      },
      {
        heading: "Credentials and links",
        body: [
          `Passwords are handled by Supabase Auth and are never seen by the application.`,
          `Links that act as credentials — a company invitation, a personal calendar subscription — are 32 random bytes, and only their SHA-256 digest is stored. A copy of the database is therefore a list of spent guesses rather than a set of working links. A wrong link and a revoked one are indistinguishable from outside, so guessing reveals nothing.`,
          `A calendar subscription is read-only, carries no instructions or notes, can be revoked at any moment, and records when it was last read — which is the only thing that makes a link that leaked visible to the person it belongs to.`,
        ],
      },
      {
        heading: "What is not collected",
        body: [
          `Worker coordinates are not stored. A clock-in checks whether it happened at the work location and keeps only that answer and a distance rounded to ten metres. The columns that once held positions were deleted; data that is not held cannot leak.`,
        ],
      },
      {
        heading: "Logs and errors",
        body: [
          `Logs carry an event name, a code and identifiers, from a fixed list of permitted fields. Free-form content does not travel: no message from the database, no row contents, no token. This is enforced in the code rather than left to habit, because a provider's error message quotes back the value that caused it — and that value is whatever somebody typed.`,
        ],
      },
      {
        heading: "Reporting a vulnerability",
        body: [
          `Write to ${LEGAL.contactEmail} with enough detail to reproduce the problem. Reports are read by a person and answered.`,
          `Testing against your own account and your own company's data is welcome. Testing that reaches another customer's data, degrades the service for others, or involves social engineering is not, and is not covered by the invitation above.`,
        ],
      },
    ],
  },
};
