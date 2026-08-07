"use client";
import { useTranslations } from "next-intl";

import { useActionState, useState } from "react";
import { EmailInput, Input, PhoneInput, Select } from "@/src/components/forms";
import { createCompanyAction, lookupVatAction, updateCompanyAction } from "../actions";
import RetentionCheckLink from "@/components/companies/RetentionCheckLink";
import { initialCompanyActionState, type CompanyFormValues } from "../types";
import { CompanyFormStatus } from "./CompanyFormStatus";
import { CompanySubmitButton } from "./CompanySubmitButton";

const empty: CompanyFormValues = { legalName:"",displayName:"",registrationNumber:"",vatNumber:"",countryCode:"BE",defaultLanguage:"en",timezone:"Europe/Brussels",currencyCode:"EUR",phone:"",email:"",website:"",addressLine1:"",addressLine2:"",postalCode:"",city:"",region:"" };
const countries = [{value:"BE",label:"Belgium"},{value:"NL",label:"Netherlands"},{value:"FR",label:"France"},{value:"DE",label:"Germany"},{value:"LU",label:"Luxembourg"},{value:"PT",label:"Portugal"}];
const languages = [{value:"en",label:"English"},{value:"fr",label:"French"},{value:"nl",label:"Dutch"},{value:"de",label:"German"},{value:"pt",label:"Portuguese"}];
const timezones = ["Europe/Brussels","Europe/Amsterdam","Europe/Paris","Europe/Berlin","Europe/Luxembourg","Europe/Lisbon"].map(value=>({value,label:value}));
const currencies = ["EUR","GBP","USD"].map(value=>({value,label:value}));

export function CompanyDetailsForm({ companyId, values = empty, canEdit = true }: { companyId?: string; values?: CompanyFormValues; canEdit?: boolean }) {
  const t = useTranslations("companies");
  const action = companyId ? updateCompanyAction.bind(null, companyId) : createCompanyAction;
  const [state, formAction] = useActionState(action, initialCompanyActionState);
  // Field errors arrive from the server as keys — a server action cannot know
  // the locale — so the sentence is chosen here.
  const error = (name: keyof CompanyFormValues) => {
    const key = state.fieldErrors?.[name];
    return key ? t(`error_${key}` as "error_status") : undefined;
  };

  const [countryCode, setCountryCode] = useState(values.countryCode);
  const [vatNumber, setVatNumber] = useState(values.vatNumber);
  const [legalName, setLegalName] = useState(values.legalName);
  const [addressLine1, setAddressLine1] = useState(values.addressLine1);
  const [postalCode, setPostalCode] = useState(values.postalCode);
  const [city, setCity] = useState(values.city);
  const tRetention = useTranslations("retention");
  const [registrationNumber, setRegistrationNumber] = useState(values.registrationNumber ?? "");
  const [displayName, setDisplayName] = useState(values.displayName ?? "");
  const [email, setEmail] = useState(values.email ?? "");
  const [phone, setPhone] = useState(values.phone ?? "");
  const [website, setWebsite] = useState(values.website ?? "");
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
    // Display name is required and was the one field the lookup left empty,
    // blocking the save. Only filled when blank, so a name the user chose
    // deliberately is never overwritten by the registry's version.
    if (result.displayName && !displayName.trim()) setDisplayName(result.displayName);
    if (result.email && !email.trim()) setEmail(result.email);
    if (result.phone && !phone.trim()) setPhone(result.phone);
    if (result.website && !website.trim()) setWebsite(result.website);
    setVatStatus({
      kind: "success",
      message: result.source === "cbe"
        ? t("filledFromCbe")
        : t("filledFromVies"),
    });
  }

  return <form action={formAction} className="space-y-6">
    <fieldset disabled={!canEdit} className="grid gap-5 sm:grid-cols-2 disabled:opacity-75">
      <Input name="displayName" label={t("fieldDisplayName")} value={displayName} onChange={(event) => setDisplayName(event.target.value)} error={error("displayName")} required maxLength={160}/>
      <Input name="legalName" label={t("fieldLegalName")} value={legalName} onChange={(event) => setLegalName(event.target.value)} error={error("legalName")} required maxLength={160}/>
      <Input name="registrationNumber" label={t("fieldRegistrationNumber")} value={registrationNumber} onChange={(event) => setRegistrationNumber(event.target.value)} error={error("registrationNumber")} maxLength={64}/>
      <div className="sm:col-span-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-4">
        <p className="text-sm font-semibold text-[#E5E7EB]">{tRetention("title")}</p>
        <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">{tRetention("intro")}</p>
        <div className="mt-3"><RetentionCheckLink enterpriseNumber={registrationNumber || vatNumber} /></div>
      </div>
      <div>
        <div className="flex items-end gap-2">
          <div className="flex-1"><Input name="vatNumber" label={t("fieldVatNumber")} value={vatNumber} onChange={(event) => setVatNumber(event.target.value)} error={error("vatNumber")} hint="e.g. BE0123456789" maxLength={64}/></div>
          <button type="button" onClick={handleVatLookup} disabled={vatStatus.kind === "loading"} className="mb-[1px] min-h-11 whitespace-nowrap rounded-lg border border-white/15 px-4 text-sm font-semibold text-[#E5E7EB] transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[#22C55E]">
            {vatStatus.kind === "loading" ? t("lookingUp") : countryCode.toUpperCase() === "BE" ? t("lookupCbe") : t("lookupVies")}
          </button>
        </div>
        {vatStatus.kind === "error" ? <p role="alert" className="mt-1 text-xs text-red-300">{vatStatus.message}</p> : null}
        {vatStatus.kind === "success" ? <p className="mt-1 text-xs text-[#4ADE80]">{vatStatus.message}</p> : null}
      </div>
      <Select name="countryCode" label={t("fieldCountry")} value={countryCode} onChange={(event) => setCountryCode(event.target.value)} options={countries} error={error("countryCode")}/>
      <Select name="defaultLanguage" label={t("fieldDefaultLanguage")} defaultValue={values.defaultLanguage} options={languages} error={error("defaultLanguage")}/>
      <Select name="timezone" label={t("fieldTimezone")} defaultValue={values.timezone} options={timezones} error={error("timezone")}/>
      <Select name="currencyCode" label={t("fieldCurrency")} defaultValue={values.currencyCode} options={currencies} error={error("currencyCode")}/>
      <EmailInput name="email" label={t("fieldCompanyEmail")} value={email} onChange={(event) => setEmail(event.target.value)} error={error("email")}/>
      <PhoneInput name="phone" label={t("fieldPhone")} value={phone} onChange={(event) => setPhone(event.target.value)} error={error("phone")}/>
      <Input name="website" type="url" label={t("fieldWebsite")} value={website} onChange={(event) => setWebsite(event.target.value)} error={error("website")} placeholder="https://"/>
      <Input name="city" label={t("fieldCity")} value={city} onChange={(event) => setCity(event.target.value)}/>
      <Input name="addressLine1" label={t("fieldAddress1")} value={addressLine1} onChange={(event) => setAddressLine1(event.target.value)}/>
      <Input name="addressLine2" label={t("fieldAddress2")} defaultValue={values.addressLine2}/>
      <Input name="postalCode" label={t("fieldPostalCode")} value={postalCode} onChange={(event) => setPostalCode(event.target.value)}/>
      <Input name="region" label={t("fieldRegion")} defaultValue={values.region}/>
    </fieldset>
    <CompanyFormStatus state={state}/>
    {canEdit ? <div className="flex justify-end"><CompanySubmitButton label={companyId ? t("saveCompany") : t("createCompanyButton")} pendingLabel={companyId ? t("saving") : t("creating")}/></div> : <p className="text-sm text-[#9CA3AF]">{t("readOnlyProfile")}</p>}
  </form>;
}
