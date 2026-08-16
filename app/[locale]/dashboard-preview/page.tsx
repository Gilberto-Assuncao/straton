"use client";

import { useState } from "react";
import styles from "./preview.module.css";

type Device = "mobile" | "desktop";
type Role = "supervisor" | "admin" | "hr";
type KpiIcon = "clock" | "team" | "alert" | "money";

type Kpi = {
  key: "approvals" | "adminHealth" | "payroll";
  label: string;
  value: string;
  color: string;
  border: string;
  cta: string;
  iconBg: string;
  icon: KpiIcon;
  trend: string;
  trendColor: string;
};
type Attention = { perm: "approvals" | "adminHealth" | "payroll"; text: string; cta: string; accent: string };
type Row = { name: string; initials: string; context: string; hours: string; badgeText: string; badgeColor: string; badgeBg: string };

const roleLabels: Record<Role, string> = { supervisor: "Supervisor", admin: "Administrador da empresa", hr: "RH / Folha" };
const headlines: Record<Role, string> = { supervisor: "A minha equipa hoje", admin: "Visão geral da operação", hr: "Fecho do período de folha" };
const subheadlines: Record<Role, string> = {
  supervisor: "Aprovações pendentes e quem ainda não registou hoje.",
  admin: "Saúde da operação, pendências administrativas e período de folha.",
  hr: "Divergências, classificações incompletas e prontidão para fechar — nada é calculado como definitivo sem revisão.",
};

const allKpis: Kpi[] = [
  { key: "approvals", label: "Aguardando aprovação", value: "7", color: "text-warning", border: "border-warning/30", cta: "Rever agora", iconBg: "bg-warning/12", icon: "clock", trend: "+2 desde ontem", trendColor: "text-warning" },
  { key: "approvals", label: "Sem registo hoje", value: "3", color: "text-danger", border: "border-[#EF4444]/30", cta: "Ver quem falta", iconBg: "bg-danger/12", icon: "alert", trend: "-1 vs. ontem", trendColor: "text-brand-bright" },
  { key: "adminHealth", label: "Equipas ativas hoje", value: "9/11", color: "text-brand-bright", border: "border-white/10", cta: "Ver mapa", iconBg: "bg-brand/12", icon: "team", trend: "82% em campo", trendColor: "text-ink-dim" },
  { key: "adminHealth", label: "Pendências administrativas", value: "12", color: "text-warning", border: "border-white/10", cta: "Resolver", iconBg: "bg-warning/12", icon: "alert", trend: "4 urgentes", trendColor: "text-warning" },
  { key: "payroll", label: "Horas aprovadas (período)", value: "4.812h", color: "text-ink-bright", border: "border-white/10", cta: "Ver detalhe", iconBg: "bg-white/10", icon: "clock", trend: "+4,2% vs. anterior", trendColor: "text-brand-bright" },
  { key: "payroll", label: "Divergências de horas", value: "6", color: "text-danger", border: "border-danger/30", cta: "Rever", iconBg: "bg-danger/12", icon: "money", trend: "precisa revisão", trendColor: "text-warning" },
];

const allAttention: Attention[] = [
  { perm: "approvals", text: "7 relatórios aguardam a sua aprovação", cta: "Aprovar", accent: "#F59E0B" },
  { perm: "adminHealth", text: "4 funcionários sem contrato definido", cta: "Resolver", accent: "#F87171" },
  { perm: "adminHealth", text: "2 projetos sem local atribuído", cta: "Resolver", accent: "#F59E0B" },
  { perm: "payroll", text: "37h ainda não classificadas neste período", cta: "Classificar", accent: "#F59E0B" },
  { perm: "payroll", text: "Período de junho ainda não fechado", cta: "Fechar", accent: "#F87171" },
];

const approvalRows: Row[] = [
  { name: "Tom Laurent", initials: "TL", context: "Estaleiro Norte", hours: "9h40", badgeText: "Sem saída", badgeColor: "text-danger", badgeBg: "bg-danger/10" },
  { name: "Amélie Roy", initials: "AR", context: "Bloco B", hours: "8h05", badgeText: "Sem alertas", badgeColor: "text-brand-bright", badgeBg: "bg-brand/10" },
  { name: "Karim Haddad", initials: "KH", context: "Logística Sul", hours: "11h20", badgeText: "Excesso de horas", badgeColor: "text-warning", badgeBg: "bg-warning/10" },
];
const payrollRows: Row[] = [
  { name: "Tom Laurent", initials: "TL", context: "Julho 2026", hours: "162h", badgeText: "Precisa revisão humana", badgeColor: "text-warning", badgeBg: "bg-warning/10" },
  { name: "Karim Haddad", initials: "KH", context: "Julho 2026", hours: "178h", badgeText: "Precisa revisão humana", badgeColor: "text-warning", badgeBg: "bg-warning/10" },
  { name: "Marta Oliveira", initials: "MO", context: "Julho 2026", hours: "168h", badgeText: "Completo", badgeColor: "text-brand-bright", badgeBg: "bg-brand/10" },
];

const emptyCopy: Record<Role, { title: string; sub: string; cta: string }> = {
  supervisor: { title: "A sua equipa ainda não foi criada", sub: "Adicione trabalhadores para começar a acompanhar pontos e aprovar relatórios.", cta: "Adicionar trabalhadores" },
  admin: { title: "Configure a sua empresa para começar", sub: "Crie o primeiro cliente, projeto e convide a sua equipa.", cta: "Criar projeto" },
  hr: { title: "Nenhum período de folha aberto", sub: "Abra o primeiro período depois de aprovar as horas do mês.", cta: "Abrir período" },
};

const weeklyBars = [
  { day: "Seg", height: 78, opacity: "opacity-55", color: "bg-brand-hover", labelColor: "text-ink-faint" },
  { day: "Ter", height: 88, opacity: "opacity-65", color: "bg-brand-hover", labelColor: "text-ink-faint" },
  { day: "Qua", height: 104, opacity: "", color: "bg-brand", labelColor: "text-ink-dim" },
  { day: "Qui", height: 84, opacity: "opacity-60", color: "bg-brand-hover", labelColor: "text-ink-faint" },
  { day: "Sex", height: 118, opacity: "", color: "bg-brand-bright", labelColor: "text-ink-dim" },
  { day: "Sáb", height: 44, opacity: "opacity-35", color: "bg-brand-hover", labelColor: "text-ink-faint" },
  { day: "Dom", height: 5, opacity: "opacity-15", color: "bg-brand-hover", labelColor: "text-ink-faint" },
];

const mapDots = [
  { top: "25%", left: "30%", color: "bg-brand", ring: "shadow-[0_0_0_7px_rgba(34,197,94,0.18)]", delay: "" },
  { top: "55%", left: "60%", color: "bg-brand-bright", ring: "shadow-[0_0_0_7px_rgba(74,222,128,0.18)]", delay: "[animation-delay:0.5s]" },
  { top: "65%", left: "22%", color: "bg-brand", ring: "shadow-[0_0_0_7px_rgba(34,197,94,0.18)]", delay: "[animation-delay:1s]" },
];

function ToggleGroup<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 rounded-[9px] bg-surface-inset p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`whitespace-nowrap rounded-md px-3.5 py-1.5 text-xs font-bold ${option.value === value ? "bg-brand text-[#06210F]" : "bg-transparent text-ink-dim"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function KpiIconGlyph({ icon, className }: { icon: KpiIcon; className: string }) {
  if (icon === "clock") return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>;
  if (icon === "team") return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="8" cy="8" r="3" /><circle cx="16" cy="9" r="2.4" /><path d="M2.5 19c0-3 2.3-5.5 5-5.5s5 2.5 5 5.5" /></svg>;
  if (icon === "alert") return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>;
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}><path d="M3 3v18h18" /><path d="M7 15l4-5 3 3 5-7" /></svg>;
}

function StratonMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 44 44" fill="none">
      <defs>
        <linearGradient id="dp-a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4ADE80" /><stop offset="1" stopColor="#22C55E" /></linearGradient>
        <linearGradient id="dp-b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#22C55E" /><stop offset="1" stopColor="#15803D" /></linearGradient>
        <linearGradient id="dp-c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#16A34A" /><stop offset="1" stopColor="#14532D" /></linearGradient>
      </defs>
      <path d="M22 5L36 13L22 21L8 13Z" fill="url(#dp-a)" />
      <path d="M8 13L22 21L22 30L8 22Z" fill="url(#dp-c)" />
      <path d="M22 21L22 30L36 22L36 13Z" fill="url(#dp-b)" />
      <path d="M8 22L22 30L22 39L8 31Z" fill="url(#dp-b)" />
      <path d="M22 30L36 22L36 31L22 39Z" fill="url(#dp-c)" />
    </svg>
  );
}

function NavItem({ icon, label, badge }: { icon: React.ReactNode; label: string; badge?: number }) {
  return (
    <div className="flex items-center justify-between rounded-[9px] px-3 py-2.5 text-sm font-medium text-ink-dim">
      <span className="flex items-center gap-2.5">{icon}{label}</span>
      {badge ? <span className="rounded-full bg-warning px-1.5 py-px text-[11px] font-extrabold text-[#1C1206]">{badge}</span> : null}
    </div>
  );
}

export default function DashboardPreviewPage() {
  const [device, setDevice] = useState<Device>("desktop");
  const [role, setRole] = useState<Role>("admin");
  const [support, setSupport] = useState(false);
  const [empty, setEmpty] = useState(false);

  const showApprovals = role === "supervisor" || role === "admin";
  const showAdminHealth = role === "admin";
  const showPayroll = role === "hr" || role === "admin";
  const permMap = { approvals: showApprovals, adminHealth: showAdminHealth, payroll: showPayroll };

  const visibleKpis = allKpis.filter((k) => permMap[k.key]);
  const visibleAttention = allAttention.filter((a) => permMap[a.perm]);

  let visibleRows: Row[] = [];
  let tableTitle = "";
  if (role === "hr") { visibleRows = payrollRows; tableTitle = "Classificação do período — Julho 2026"; }
  else if (role === "supervisor") { visibleRows = approvalRows; tableTitle = "Para aprovar agora"; }
  else { visibleRows = [...approvalRows.slice(0, 2), ...payrollRows.slice(0, 1)]; tableTitle = "Central de aprovação e período"; }

  return (
    <div className={`${styles.page} min-h-screen bg-canvas text-ink-bright`}>
      {/* Simulation controls — not part of the product UI, only this prototype */}
      <div className="sticky top-0 z-[200] flex flex-wrap items-center gap-5 border-b border-white/10 bg-surface-deep px-7 py-4">
        <span className="text-xs font-bold uppercase tracking-wide text-ink-faint">Simulação de permissões</span>
        <ToggleGroup options={[{ value: "mobile", label: "Mobile" }, { value: "desktop", label: "Desktop" }]} value={device} onChange={setDevice} />
        {device === "desktop" ? (
          <>
            <ToggleGroup
              options={[{ value: "supervisor", label: "Supervisor" }, { value: "admin", label: "Administrador" }, { value: "hr", label: "RH / Folha" }]}
              value={role}
              onChange={setRole}
            />
            <button
              type="button"
              onClick={() => setSupport((s) => !s)}
              className={`whitespace-nowrap rounded-[9px] border border-warning/40 px-4 py-2 text-xs font-bold ${support ? "bg-warning text-[#1C1206]" : "bg-transparent text-warning"}`}
            >
              Modo suporte: {support ? "Ativo" : "Inativo"}
            </button>
          </>
        ) : null}
        <button type="button" onClick={() => setEmpty((e) => !e)} className="ml-auto whitespace-nowrap rounded-[9px] border border-white/20 bg-transparent px-4 py-2 text-xs font-bold text-ink-bright">
          Dados: {empty ? "Vazio" : "Com dados"}
        </button>
      </div>

      {/* ===================== MOBILE SHELL (worker) ===================== */}
      {device === "mobile" ? (
        <div className="flex justify-center px-4 py-8">
          <div className="w-[390px] rounded-[32px] border border-white/10 bg-surface-deep p-5 shadow-2xl shadow-black/50">
            {empty ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[18px] bg-brand/10">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>
                </div>
                <div className="mb-2.5 text-[19px] font-bold">Ainda sem registos</div>
                <p className="mb-7 text-sm leading-relaxed text-ink-dim">Assim que iniciar o seu dia, o seu ponto e as suas tarefas aparecem aqui.</p>
                <button type="button" className="w-full rounded-[14px] bg-brand p-4 text-base font-bold text-[#06210F]">Iniciar o meu dia</button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between px-2 pb-5">
                  <div>
                    <div className="text-[13px] text-ink-faint">Olá, João</div>
                    <div className="text-[17px] font-bold">Terça, 23 julho</div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-bright to-brand-hover text-sm font-bold text-[#06210F]">JS</div>
                </div>

                <div className="mb-4 rounded-[22px] bg-surface-inset p-6 text-center">
                  <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1.5 text-xs font-bold text-brand-bright">
                    <span className={`h-1.5 w-1.5 rounded-full bg-brand-bright ${styles.pulseDot}`} />EM SERVIÇO
                  </div>
                  <div className={`${styles.mono} mb-1.5 text-[44px] font-bold`}>03:24<span className="text-[22px] text-ink-faint">:10</span></div>
                  <div className="mb-5 text-[13px] text-ink-dim">Estaleiro Norte — Bloco B · desde 07:58</div>
                  <button type="button" className="w-full rounded-[14px] bg-[#EF4444] p-4 text-base font-bold text-white">Terminar jornada</button>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-3">
                  <button type="button" className="flex flex-col items-center gap-2 rounded-2xl bg-surface-inset px-3 py-4.5 text-[13px] font-semibold">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 3v3M16 3v3" /></svg>
                    Enviar relatório
                  </button>
                  <button type="button" className="flex flex-col items-center gap-2 rounded-2xl bg-surface-inset px-3 py-4.5 text-[13px] font-semibold">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 12l9 4 9-4" /></svg>
                    Ver escala
                  </button>
                </div>

                <div className="mb-3.5 flex items-start gap-3 rounded-2xl border border-warning/25 bg-warning/10 px-4.5 py-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" className="mt-0.5 shrink-0"><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
                  <div>
                    <div className="mb-1 text-sm font-semibold">Relatório de segunda devolvido</div>
                    <div className="text-[13px] text-ink-dim">O supervisor pediu para corrigir a hora de saída. Toque para corrigir.</div>
                  </div>
                </div>

                <div className="my-5 text-[13px] font-semibold uppercase tracking-wide text-ink-faint">Últimos dias</div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between rounded-xl bg-surface-inset px-4 py-3.5">
                    <span className="text-sm">Segunda-feira</span>
                    <span className="rounded-full bg-warning/10 px-2.5 py-1 text-[13px] font-semibold text-warning">Corrigir</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-surface-inset px-4 py-3.5">
                    <span className="text-sm">Domingo</span>
                    <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[13px] font-semibold text-brand-bright">Aprovado</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* ===================== DESKTOP SHELL ===================== */}
      {device === "desktop" ? (
        <div>
          {support ? (
            <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2.5 border-b-2 border-warning bg-[#7C2D12] px-7 py-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FDE68A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
                <span className="whitespace-nowrap text-[13px] font-bold text-[#FDE68A]">A ver <u>BuildCo SA</u> como suporte da plataforma — sessão registada em auditoria</span>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <span className="whitespace-nowrap rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-bold text-[#FDE68A]">SOMENTE LEITURA</span>
                <button type="button" className="whitespace-nowrap rounded-[7px] bg-[#FDE68A] px-3.5 py-1.5 text-xs font-bold text-[#7C2D12]">Ativar edição</button>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-[260px_1fr]">
            <aside className="flex min-h-[calc(100vh-60px)] flex-col border-r border-white/10 bg-surface-deep px-[16px] py-6">
              <div className="mb-5 flex items-center gap-2.5 px-2">
                <StratonMark />
                <span className="text-[17px] font-extrabold tracking-wide">STRATON</span>
              </div>

              <button type="button" className="mb-6 flex items-center justify-between gap-2 rounded-[10px] border border-white/10 bg-surface-inset px-3 py-2.5 text-ink-bright">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] bg-gradient-to-br from-brand-bright to-brand-hover text-[11px] font-extrabold text-[#06210F]">BC</span>
                  <span className="truncate text-[13px] font-semibold">BuildCo SA</span>
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" className="shrink-0"><path d="M7 10l5 5 5-5" /></svg>
              </button>

              <nav className="flex flex-1 flex-col gap-5">
                <div>
                  <div className="mb-2 px-3 text-[10.5px] font-bold uppercase tracking-wide text-[#475569]">Geral</div>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2.5 rounded-[9px] bg-brand/10 px-3 py-2.5 text-sm font-semibold text-brand-bright">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
                      Dashboard
                    </div>
                    <NavItem label="Mapa ao vivo" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18M3 12h18" /></svg>} />
                  </div>
                </div>

                {showApprovals ? (
                  <div>
                    <div className="mb-2 px-3 text-[10.5px] font-bold uppercase tracking-wide text-[#475569]">Operações</div>
                    <div className="flex flex-col gap-0.5">
                      <NavItem badge={7} label="Aprovações" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 3v3M16 3v3" /></svg>} />
                      <NavItem label="Equipas" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="3.2" /><circle cx="17" cy="9" r="2.6" /><path d="M2.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6" /></svg>} />
                      <NavItem label="Projetos" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 12l9 4 9-4" /></svg>} />
                      <NavItem label="Locais" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="10" r="2.6" /></svg>} />
                    </div>
                  </div>
                ) : null}

                {showPayroll ? (
                  <div>
                    <div className="mb-2 px-3 text-[10.5px] font-bold uppercase tracking-wide text-[#475569]">Financeiro</div>
                    <div className="flex flex-col gap-0.5">
                      <NavItem badge={6} label="Folha & Contabilidade" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M7 15l4-5 3 3 5-7" /></svg>} />
                      <NavItem label="Despesas" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>} />
                      <NavItem label="Períodos" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></svg>} />
                    </div>
                  </div>
                ) : null}

                {showAdminHealth ? (
                  <div>
                    <div className="mb-2 px-3 text-[10.5px] font-bold uppercase tracking-wide text-[#475569]">Empresa</div>
                    <div className="flex flex-col gap-0.5">
                      <NavItem label="Clientes" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>} />
                      <NavItem label="Configurações" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></svg>} />
                    </div>
                  </div>
                ) : null}
              </nav>

              <div className="mt-5 flex items-center gap-2.5 rounded-xl bg-surface-inset p-3">
                <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-bright to-brand-hover text-[13px] font-bold text-[#06210F]">SV</div>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold">{roleLabels[role]}</div>
                  <div className="text-[11px] text-ink-faint">Sara Vermeulen</div>
                </div>
              </div>
            </aside>

            <main className="relative px-9 pb-16 pt-8">
              <div className="pointer-events-none absolute -top-10 right-[60px] h-[280px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.1),transparent_70%)] blur-[30px]" />

              <div className="relative mb-7 flex items-center justify-between gap-5">
                <div className="relative max-w-[340px] flex-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" className="absolute left-[13px] top-1/2 -translate-y-1/2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
                  <input placeholder="Pesquisar colaborador, projeto, site…" className="w-full rounded-[9px] border border-white/10 bg-surface-deep py-2.5 pl-9 pr-3.5 text-[13px] text-ink-bright placeholder:text-ink-faint" />
                </div>
                <div className="flex shrink-0 items-center gap-4.5">
                  <div className="relative">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
                    <span className="absolute -right-0.5 -top-0.5 h-[7px] w-[7px] rounded-full border-2 border-surface-deep bg-brand" />
                  </div>
                  <div className="h-6 w-px bg-white/10" />
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-bright to-brand-hover text-xs font-bold text-[#06210F]">SV</div>
                </div>
              </div>

              <div className="relative mb-7 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-2.5 flex items-center gap-2 text-xs text-ink-faint">
                    <span>STRATON</span><span>/</span><span className="text-ink-dim">Dashboard</span><span>/</span><span className="text-brand-bright">{roleLabels[role]}</span>
                  </div>
                  <h1 className="mb-2 text-[28px] font-bold tracking-tight">{headlines[role]}</h1>
                  <p className="max-w-[640px] text-[15px] text-ink-dim">{subheadlines[role]}</p>
                </div>
                {support ? (
                  <div className="flex shrink-0 gap-1 rounded-[10px] bg-surface-inset p-1">
                    <button type="button" className="whitespace-nowrap rounded-[7px] bg-transparent px-3.5 py-2 text-xs font-semibold text-ink-dim">Minha conta</button>
                    <button type="button" className="whitespace-nowrap rounded-[7px] bg-warning px-3.5 py-2 text-xs font-bold text-[#1C1206]">BuildCo SA (suporte)</button>
                  </div>
                ) : null}
              </div>

              {empty ? (
                <div className="rounded-2xl border border-white/10 bg-surface-deep px-10 py-20 text-center">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  </div>
                  <div className="mb-2.5 text-xl font-bold">{emptyCopy[role].title}</div>
                  <p className="mb-7 text-[15px] text-ink-dim">{emptyCopy[role].sub}</p>
                  <button type="button" className="rounded-[10px] bg-brand px-6 py-3.5 text-sm font-bold text-[#06210F]">{emptyCopy[role].cta}</button>
                </div>
              ) : (
                <div>
                  {/* KPI ROW: same card component, filtered by permission */}
                  <div className="mb-6 grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                    {visibleKpis.map((kpi) => (
                      <div key={kpi.label} className={`rounded-2xl border ${kpi.border} bg-surface-deep p-5.5 transition hover:-translate-y-0.5 hover:border-brand/35`}>
                        <div className="mb-3.5 flex items-start justify-between">
                          <span className="text-[13px] text-ink-dim">{kpi.label}</span>
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] ${kpi.iconBg}`}>
                            <KpiIconGlyph icon={kpi.icon} className={kpi.color} />
                          </span>
                        </div>
                        <div className={`${styles.mono} text-[30px] font-bold ${kpi.color}`}>{kpi.value}</div>
                        <div className="mt-2.5 flex items-center justify-between">
                          <a href="#" className="text-[13px] font-semibold text-brand-bright hover:text-brand">{kpi.cta} →</a>
                          <span className={`text-[11px] font-bold ${kpi.trendColor}`}>{kpi.trend}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ATTENTION LIST: same component, filtered by permission */}
                  <div className="mb-6 rounded-2xl border border-white/10 bg-surface-deep p-6">
                    <div className="mb-4.5 text-base font-semibold">Precisa da sua atenção</div>
                    <div className="flex flex-col gap-2.5">
                      {visibleAttention.map((item) => (
                        <div key={item.text} className="flex items-center justify-between rounded-[10px] bg-surface-inset py-3.5 pl-4 pr-4 transition hover:bg-[#152040]" style={{ borderLeft: `3px solid ${item.accent}` }}>
                          <span className="flex items-center gap-2.5 text-sm">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: item.accent }} />
                            {item.text}
                          </span>
                          <a href="#" className="whitespace-nowrap text-[13px] font-semibold text-brand-bright hover:text-brand">{item.cta} →</a>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CHART + MAP: richer secondary widgets */}
                  <div className="mb-6 grid grid-cols-[1.6fr_1fr] gap-5">
                    <div className="rounded-2xl border border-white/10 bg-surface-deep p-6.5">
                      <div className="mb-6 flex items-center justify-between">
                        <span className="text-[15px] font-semibold">Horas por dia</span>
                        <span className="text-xs text-ink-faint">17 – 23 julho</span>
                      </div>
                      <div className="flex h-[140px] items-end gap-3.5">
                        {weeklyBars.map((bar) => (
                          <div key={bar.day} className="flex flex-1 flex-col items-center gap-1.5">
                            <div className={`w-full rounded-t ${bar.color} ${bar.opacity}`} style={{ height: `${bar.height}px` }} />
                            <span className={`text-[11px] ${bar.labelColor}`}>{bar.day}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col rounded-2xl border border-white/10 bg-surface-deep p-5.5">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-[15px] font-semibold">Mapa ao vivo</span>
                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-brand-bright">
                          <span className={`h-1.5 w-1.5 rounded-full bg-brand-bright ${styles.pulseDot}`} />AO VIVO
                        </span>
                      </div>
                      <div className={`relative min-h-[130px] flex-1 overflow-hidden rounded-xl ${styles.mapPattern}`}>
                        {mapDots.map((dot, index) => (
                          <span key={index} className={`absolute h-2.5 w-2.5 rounded-full ${dot.color} ${dot.ring} ${styles.pulseDot} ${dot.delay}`} style={{ top: dot.top, left: dot.left }} />
                        ))}
                      </div>
                      <div className="mt-3 text-xs text-ink-dim">3 equipas ativas · atualizado há 12s</div>
                    </div>
                  </div>

                  {/* SHARED TABLE: rows adapt to approval or payroll type */}
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface-deep">
                    <div className="flex items-center justify-between border-b border-white/5 px-6 py-4.5 text-[15px] font-bold">
                      {tableTitle}
                      {support ? <span className="text-[11px] font-bold text-warning">Edição bloqueada — ative acima para alterar</span> : null}
                    </div>
                    <div className="grid grid-cols-[1.6fr_1.2fr_1fr_1.2fr_1fr] px-6 py-2.5 text-[11px] uppercase tracking-wide text-ink-faint">
                      <span>Nome</span><span>Contexto</span><span>Horas</span><span>Estado</span><span />
                    </div>
                    {visibleRows.map((row) => (
                      <div key={row.name} className={`grid grid-cols-[1.6fr_1.2fr_1fr_1.2fr_1fr] items-center border-t border-white/5 px-6 py-4 transition hover:bg-surface-inset ${support ? "opacity-70" : ""}`}>
                        <span className="flex items-center gap-2.5 text-sm font-medium">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-bright to-brand-hover text-[10px] font-bold text-[#06210F]">{row.initials}</span>
                          {row.name}
                        </span>
                        <span className="text-sm text-ink-dim">{row.context}</span>
                        <span className={`${styles.mono} text-sm`}>{row.hours}</span>
                        <span className={`justify-self-start rounded-md px-2.5 py-1 text-xs font-bold ${row.badgeColor} ${row.badgeBg}`}>{row.badgeText}</span>
                        {support ? (
                          <span className="text-[13px] text-[#475569]">bloqueado</span>
                        ) : (
                          <div className="flex gap-2">
                            <button type="button" className="h-[30px] w-[30px] rounded-lg bg-brand/15 text-brand-bright">✓</button>
                            <button type="button" className="h-[30px] w-[30px] rounded-lg bg-danger/15 text-danger">✕</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      ) : null}
    </div>
  );
}
