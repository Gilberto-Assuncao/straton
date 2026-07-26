"use client";

import { useActionState, useState } from "react";
import { EmailInput, Input, PhoneInput, Select } from "@/src/components/forms";
import { createCompanyAction, lookupVatAction, updateCompanyAction } from "../actions";
import { initialCompanyActionState, type CompanyFormValues } from "../types";
import { CompanyFormStatus } from "./CompanyFormStatus";
import { CompanySubmitButton } from "./CompanySubmitButton";

const empty: CompanyFormValues = { legalName:"",displayName:"",registrationNumber:"",vatNumber:"",countryCode:"BE",defaultLanguage:"en",timezone:"Europe/Brussels",currencyCode:"EUR",phone:"",email:"",website:"",addressLine1:"",addressLine2:"",postalCode:"",city:"",region:"" };
const countries = [{value:"BE",label:"Belgium"},{value:"NL",label:"Netherlands"},{value:"FR",label:"France"},{value:"DE",label:"Germany"},{value:"LU",label:"Luxembourg"},{value:"PT",label:"Portugal"}];
const languages = [{value:"en",label:"English"},{value:"fr",label:"French"},{value:"nl",label:"Dutch"},{value:"de",label:"German"},{value:"pt",label:"Portuguese"}];
const timezones = ["Europe/Brussels","Europe/Amsterdam","Europe/Paris","Europe/Berlin","Europe/Luxembourg","Europe/Lisbon"].map(value=>({value,label:value}));
const currencies = ["EUR","GBP","USD"].map(value=>({value,label:value}));

export function CompanyDetailsForm({ companyId, values = empty, canEdit = true }: { companyId?: string; values?: CompanyFormValues; canEdit?: boolean }) {
  const action = companyId ? updateCompanyAction.bind(null, companyId) : createCompanyAction;
  const [state, formAction] = useActionState(action, initialCompanyActionState);
  const error = (name: keyof CompanyFormValues) => state.fieldErrors?.[name];

  const [countryCode, setCountryCode] = useState(values.countryCode);
  const [vatNumber, setVatNumber] = useState(values.vatNumber);
  const [legalName, setLegalName] = useState(values.legalName);
  const [addressLine1, setAddressLine1] = useState(values.addressLine1);
  const [postalCode, setPostalCode] = useState(values.postalCode);
  const [city, setCity] = useState(values.city);
  const [registrationNumber, setRegistrationNumber] = useState(values.registrationNumber ?? "");
  const [vatStatus, setVatStatus] = useState<{ kind: "idle" | "loading" | "error" | "success"; message?: string }>({ kind: "idle" });

  async function handleVatLookup() {
    setVatStatus({ kind: "loading" });
    const result = await lookupVatAction(countryCode, vatNumber);
    if (!result.valid) { setVatStatus({ kind: "error", message: result.message }); return; }
    setLegalName(result.legalName);
    setAddressLine1(result.addressLine1);
    setPostalCode(result.postalCode);
    setCity(result.city);
    // The Belgian register also returns the enterprise number; VIES does not,
    // which is why this field stayed empty until now.
    if (result.registrationNumber) setRegistrationNumber(result.registrationNumber);
    setVatStatus({
      kind: "success",
      message: result.source === "cbe"
        ? "Filled in from the Belgian register (KBO/BCE) — review before saving."
        : "Filled in from VIES — review before saving.",
    });
  }

  return <form action={formAction} className="space-y-6">
    <fieldset disabled={!canEdit} className="grid gap-5 sm:grid-cols-2 disabled:opacity-75">
      <Input name="displayName" label="Display name" defaultValue={values.displayName} error={error("displayName")} required maxLength={160}/>
      <Input name="legalName" label="Legal name" value={legalName} onChange={(event) => setLegalName(event.target.value)} error={error("legalName")} required maxLength={160}/>
      <Input name="registrationNumber" label="Registration number" value={registrationNumber} onChange={(event) => setRegistrationNumber(event.target.value)} error={error("registrationNumber")} maxLength={64}/>
      <div>
        <div className="flex items-end gap-2">
          <div className="flex-1"><Input name="vatNumber" label="VAT number" value={vatNumber} onChange={(event) => setVatNumber(event.target.value)} error={error("vatNumber")} hint="e.g. BE0123456789" maxLength={64}/></div>
          <button type="button" onClick={handleVatLookup} disabled={vatStatus.kind === "loading"} className="mb-[1px] min-h-11 whitespace-nowrap rounded-lg border border-white/15 px-4 text-sm font-semibold text-[#E5E7EB] transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[#22C55E]">
            {vatStatus.kind === "loading" ? "Looking up…" : countryCode.toUpperCase() === "BE" ? "Look up KBO/BCE" : "Look up VIES"}
          </button>
        </div>
        {vatStatus.kind === "error" ? <p role="alert" className="mt-1 text-xs text-red-300">{vatStatus.message}</p> : null}
        {vatStatus.kind === "success" ? <p className="mt-1 text-xs text-[#4ADE80]">{vatStatus.message}</p> : null}
      </div>
      <Select name="countryCode" label="Country" value={countryCode} onChange={(event) => setCountryCode(event.target.value)} options={countries} error={error("countryCode")}/>
      <Select name="defaultLanguage" label="Default language" defaultValue={values.defaultLanguage} options={languages} error={error("defaultLanguage")}/>
      <Select name="timezone" label="Timezone" defaultValue={values.timezone} options={timezones} error={error("timezone")}/>
      <Select name="currencyCode" label="Currency" defaultValue={values.currencyCode} options={currencies} error={error("currencyCode")}/>
      <EmailInput name="email" label="Company email" defaultValue={values.email} error={error("email")}/>
      <PhoneInput name="phone" label="Phone" defaultValue={values.phone} error={error("phone")}/>
      <Input name="website" type="url" label="Website" defaultValue={values.website} error={error("website")} placeholder="https://"/>
      <Input name="city" label="City" value={city} onChange={(event) => setCity(event.target.value)}/>
      <Input name="addressLine1" label="Address line 1" value={addressLine1} onChange={(event) => setAddressLine1(event.target.value)}/>
      <Input name="addressLine2" label="Address line 2" defaultValue={values.addressLine2}/>
      <Input name="postalCode" label="Postal code" value={postalCode} onChange={(event) => setPostalCode(event.target.value)}/>
      <Input name="region" label="Region" defaultValue={values.region}/>
    </fieldset>
    <CompanyFormStatus state={state}/>
    {canEdit ? <div className="flex justify-end"><CompanySubmitButton label={companyId ? "Save company" : "Create company"} pendingLabel={companyId ? "Saving…" : "Creating…"}/></div> : <p className="text-sm text-[#9CA3AF]">Your role provides read-only access.</p>}
  </form>;
}
