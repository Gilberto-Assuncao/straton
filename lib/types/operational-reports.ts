export type ReportSegment =
  | "construction"
  | "cleaning"
  | "maintenance"
  | "security"
  | "landscaping"
  | "technical_assistance"
  | "facilities"
  | "general_services"
  | "custom";

export type ReportFieldType = "text" | "number" | "date" | "select" | "multiselect" | "checklist" | "photo" | "signature" | "boolean";

export type OperationalReportStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected" | "changes_requested";

export type FieldOption = { value: string; label: string };

export type ReportTemplateField = {
  id: string;
  key: string;
  label: string;
  fieldType: ReportFieldType;
  required: boolean;
  options: FieldOption[];
  displayOrder: number;
};

export type ReportTemplate = {
  id: string;
  segment: ReportSegment;
  name: string;
  description: string | null;
  fields: ReportTemplateField[];
};

export type FieldValue = string | number | boolean | string[] | null;

export type OperationalReportListItem = {
  id: string;
  reportDate: string;
  workerName: string;
  templateName: string | null;
  siteName: string | null;
  status: OperationalReportStatus;
};

export type OperationalReportHistoryEntry = {
  id: string;
  action: string;
  actorName: string | null;
  note: string | null;
  occurredAt: string;
};

export type OperationalReportDetail = {
  id: string;
  companyId: string;
  workerId: string;
  workerName: string;
  templateId: string | null;
  templateName: string | null;
  templateFields: ReportTemplateField[];
  teamId: string | null;
  siteId: string | null;
  siteName: string | null;
  reportDate: string;
  startsAt: string | null;
  endsAt: string | null;
  breakMinutes: number;
  activity: string | null;
  notes: string | null;
  status: OperationalReportStatus;
  rejectionReason: string | null;
  values: Record<string, FieldValue>;
  history: OperationalReportHistoryEntry[];
};
