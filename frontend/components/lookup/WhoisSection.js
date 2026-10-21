"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Mail, Phone, ShieldAlert } from "lucide-react";
import Badge from "@/components/ui/Badge";
import CopyButton from "@/components/ui/CopyButton";
import Field, { FieldList } from "@/components/ui/Field";
import Flag from "@/components/ui/Flag";
import Section from "@/components/ui/Section";
import { whois } from "@/services/api";
import { formatDate } from "@/lib/format";

const ROLE_LABELS = { registrant: "Registrant", abuse: "Abuse", administrative: "Admin", technical: "Technical", noc: "NOC" };

function Contact({ contact }) {
  return (
    <li className="py-2.5 text-[13px] leading-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-zinc-100">{contact.name ?? contact.handle}</span>
        {contact.roles.map((r) => <Badge key={r}>{ROLE_LABELS[r] ?? r}</Badge>)}
      </div>
      {contact.email && (
        <a href={`mailto:${contact.email}`} className="mt-0.5 block truncate text-zinc-400 hover:text-emerald-300">{contact.email}</a>
      )}
      {contact.phone && <div className="text-zinc-500">{contact.phone}</div>}
      {contact.address && <div className="whitespace-pre-line text-[12.5px] text-zinc-500">{contact.address}</div>}
    </li>
  );
}

export default function WhoisSection({ query }) {
  const [state, setState] = useState({ data: null, error: null });

  useEffect(() => {
    let active = true;
    whois(query).then(
      (data) => active && setState({ data, error: null }),
      (e) => active && setState({ data: null, error: e.message }),
    );
    return () => {
      active = false;
    };
  }, [query]);

  const { data, error } = state;
  const contacts = data?.contacts.filter((c) => c.name || c.email) ?? [];

  return (
    <Section
      title="Registration (WHOIS)"
      bodyClassName=""
      actions={data && (
        <a
          href={data.registry.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[12px] text-zinc-400 hover:text-zinc-100"
        >
          {data.registry.name}
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    >
      {error ? (
        <p className="px-4 py-4 text-[13px] text-zinc-500">No registration record: {error}</p>
      ) : !data ? (
        <div className="grid gap-3 p-4 md:grid-cols-2" aria-busy="true">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-5 animate-pulse rounded bg-zinc-800/60" />)}
        </div>
      ) : (
        <div className="grid md:grid-cols-[1.2fr_1fr] md:divide-x md:divide-zinc-800">
          <div className="px-4 py-2">
            <FieldList>
              <Field label="Organisation" value={data.organization} />
              <Field label="Network name" value={data.name} mono />
              <Field label="Handle" value={data.handle} mono />
              <Field label="Range" value={data.range && `${data.range.start} – ${data.range.end}`} mono />
              <Field label="CIDR" value={data.cidrs.join(", ")} mono />
              <Field
                label="AS numbers"
                value={data.asnRange && (data.asnRange.start === data.asnRange.end ? `AS${data.asnRange.start}` : `AS${data.asnRange.start} – AS${data.asnRange.end}`)}
                mono
              />
              <Field label="Type" value={data.type} />
              <Field
                label="Country"
                value={data.country && (
                  <span className="inline-flex items-center gap-2">
                    <Flag code={data.country} />
                    {data.country}
                  </span>
                )}
              />
              <Field label="Status" value={data.status.join(", ")} />
              <Field label="Parent" value={data.parent} mono />
              <Field label="Registered" value={data.registered && formatDate(data.registered)} />
              <Field label="Last updated" value={data.updated && formatDate(data.updated)} />
              <Field label="WHOIS server" value={data.registry.whoisServer} mono />
            </FieldList>
          </div>

          <div className="border-t border-zinc-800 px-4 py-3 md:border-t-0">
            {data.abuse && (data.abuse.email || data.abuse.phone) && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.05] p-3">
                <div className="flex items-center gap-1.5 text-[12px] font-medium text-amber-200">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Abuse contact
                </div>
                {data.abuse.email && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[13px]">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                    <a href={`mailto:${data.abuse.email}`} className="truncate text-zinc-100 hover:text-emerald-300">{data.abuse.email}</a>
                    <CopyButton value={data.abuse.email} label="Copy email" />
                  </div>
                )}
                {data.abuse.phone && (
                  <div className="mt-1 flex items-center gap-1.5 text-[13px] text-zinc-300">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                    {data.abuse.phone}
                  </div>
                )}
              </div>
            )}

            {contacts.length > 0 && (
              <>
                <h4 className="mt-4 text-[12px] font-medium text-zinc-500 first:mt-0">Contacts</h4>
                <ul className="max-h-72 divide-y divide-zinc-800/70 overflow-y-auto">
                  {contacts.map((c) => <Contact key={c.handle ?? c.name} contact={c} />)}
                </ul>
              </>
            )}

            {data.remarks.length > 0 && (
              <details className="mt-3 text-[12.5px]">
                <summary className="cursor-pointer text-zinc-500 hover:text-zinc-300">Remarks ({data.remarks.length})</summary>
                <div className="mt-2 space-y-2">
                  {data.remarks.map((r, i) => (
                    <p key={i} className="whitespace-pre-line leading-5 text-zinc-400">
                      {r.title && <span className="block font-medium text-zinc-300">{r.title}</span>}
                      {r.text}
                    </p>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      )}
    </Section>
  );
}
