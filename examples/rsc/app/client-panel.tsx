"use client";

import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { esEs } from "@use-puncta/with-es-es";
import { Puncta, PunctaProvider } from "@use-puncta/with-react";
import { type ReactNode, useState, version } from "react";

// The client module owns its instance and static resources, including during SSR.
const instance = createPuncta({ locales: [enGb, esEs], locale: enGb.id });

export default function ClientPanel({
  source,
  children,
}: {
  source: string;
  children: ReactNode;
}) {
  const [text, setText] = useState(source);
  const [locale, setLocale] = useState<"en-gb" | "es-es">("en-gb");
  const [hyphenation, setHyphenation] = useState(true);
  const [grouping, setGrouping] = useState(true);
  return (
    <section aria-label="Client typography">
      <p>
        Client React: <output id="client-react">{version}</output>
      </p>
      <label>
        Text{" "}
        <input value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      <label htmlFor="locale">Locale</label>
      <select
        id="locale"
        value={locale}
        onChange={(event) =>
          setLocale(event.target.value === "es-es" ? "es-es" : "en-gb")
        }
      >
        <option value="en-gb">en-gb</option>
        <option value="es-es">es-es</option>
      </select>
      <label>
        <input
          type="checkbox"
          checked={hyphenation}
          onChange={(event) => setHyphenation(event.target.checked)}
        />
        Hyphenation
      </label>
      <label>
        <input
          type="checkbox"
          checked={grouping}
          onChange={(event) => setGrouping(event.target.checked)}
        />
        Digit grouping
      </label>
      <PunctaProvider
        instance={instance}
        locale={locale}
        options={{
          hyphenation: { enabled: hyphenation },
          rules: { digitGrouping: { enabled: grouping, minDigits: 4 } },
        }}
      >
        <p id="client-text">
          <Puncta>{text}</Puncta>
        </p>
        <p id="client-grouped">
          <Puncta>
            {12345}; {12345678901234567890n}
          </Puncta>
        </p>
        {children}
      </PunctaProvider>
    </section>
  );
}
