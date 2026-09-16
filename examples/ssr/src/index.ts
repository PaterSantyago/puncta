import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createPuncta } from "@use-puncta/core";
import { Puncta } from "@use-puncta/with-react";
import { enGb } from "@use-puncta/with-en-gb";
import { esEs } from "@use-puncta/with-es-es";

for (const locale of [enGb, esEs]) {
  const instance = createPuncta({ locales: [locale], locale: locale.id });
  console.log(renderToString(createElement(Puncta, { instance }, "Wait...")));
}
