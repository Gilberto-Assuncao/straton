"use client";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Input, Select, Textarea, Checkbox } from "@/src/components/forms";
import { Button } from "@/src/components/ui";
import { createTeamAction, updateTeamAction } from "../actions";
import { initialTeamActionState, type AvailableMember, type TeamFormValues } from "../types";

export function TeamForm({
  teamId,
  values = { name: "", description: "", status: "active", color: "#22C55E", icon: "team", leaderMembershipId: "", memberIds: [] },
  members,
  canManage = true,
}: {
  teamId?: string;
  values?: TeamFormValues;
  members: AvailableMember[];
  canManage?: boolean;
}) {
  const t = useTranslations("teams");
  const [state, action] = useActionState(teamId ? updateTeamAction.bind(null, teamId) : createTeamAction, initialTeamActionState);

  /** Field errors arrive as keys too, so the sentence is picked here. */
  const fieldError = (key?: string) => (key ? t(`error_${key}` as "error_name") : undefined);

  const statuses = [
    { value: "active", label: t("status_active") },
    { value: "inactive", label: t("status_inactive") },
  ];

  return (
    <form action={action} className="space-y-6">
      <fieldset disabled={!canManage} className="grid gap-5 sm:grid-cols-2 disabled:opacity-70">
        <Input name="name" label={t("fieldName")} defaultValue={values.name} error={fieldError(state.fieldErrors?.name)} required maxLength={100} />
        <Input name="color" type="color" label={t("fieldColor")} defaultValue={values.color} error={fieldError(state.fieldErrors?.color)} />
        <div className="sm:col-span-2">
          <Textarea name="description" label={t("fieldDescription")} defaultValue={values.description} maxLength={500} />
        </div>
        <Select
          name="status"
          label={t("fieldStatus")}
          defaultValue={values.status === "archived" ? "inactive" : values.status}
          options={statuses}
          error={fieldError(state.fieldErrors?.status)}
        />
        <Select
          name="leaderMembershipId"
          label={t("fieldLeader")}
          defaultValue={values.leaderMembershipId}
          options={[
            { value: "", label: t("noLeader") },
            ...members.map((member) => ({ value: member.membershipId, label: `${member.name} — ${member.jobTitle}` })),
          ]}
          error={fieldError(state.fieldErrors?.leaderMembershipId)}
        />
        {!teamId ? (
          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-medium">{t("initialMembers")}</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {members.map((member) => (
                <Checkbox
                  key={member.membershipId}
                  name="memberIds"
                  value={member.membershipId}
                  defaultChecked={values.memberIds.includes(member.membershipId)}
                  label={`${member.name} · ${member.jobTitle}`}
                />
              ))}
            </div>
          </fieldset>
        ) : null}
      </fieldset>

      {state.messageKey ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`rounded-xl border p-3 text-sm ${
            state.status === "error"
              ? "border-red-400/30 bg-red-400/10 text-red-200"
              : "border-green-400/30 bg-green-400/10 text-green-100"
          }`}
        >
          {t(`message_${state.messageKey}` as "message_failed")}
        </p>
      ) : null}

      {canManage ? (
        <div className="flex justify-end">
          <Button type="submit">{teamId ? t("saveTeam") : t("createTeam")}</Button>
        </div>
      ) : (
        <p className="text-sm text-ink-muted">{t("readOnly")}</p>
      )}
    </form>
  );
}
