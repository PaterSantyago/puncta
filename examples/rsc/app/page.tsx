import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { esEs } from "@use-puncta/with-es-es";
// This import must become a Flight client reference via the package's directive.
import { Puncta } from "@use-puncta/with-react";
import { version } from "react";
import ClientPanel from "./client-panel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function ServerText() {
  // Server Components cannot read the client Provider. All configuration is explicit.
  const instance = createPuncta({ locales: [enGb, esEs], locale: esEs.id });
  const text = instance.text('"camino"...', { hyphenation: { enabled: true } });
  return (
    <>
      <p id="server-text">{text}</p>
      <p id="server-grouped">
        {instance.text("1,234; 12345", {
          rules: { digitGrouping: { enabled: true, minDigits: 4 } },
        })}
      </p>
    </>
  );
}

export default function Page() {
  return (
    <main>
      <h1>Puncta across the RSC boundary</h1>
      <p>
        Server React: <output id="server-react">{version}</output>
      </p>
      <ClientPanel source={'"backbone"...'}>
        <p id="package-boundary">
          <Puncta>{'"scope"...'}</Puncta>
        </p>
        <p id="package-grouped">
          <Puncta>{"1,234; 12345"}</Puncta>
        </p>
        <ServerText />
        <p id="server-raw">{'"camino"...'}</p>
      </ClientPanel>
    </main>
  );
}
