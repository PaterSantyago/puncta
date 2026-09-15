import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { Puncta } from "@use-puncta/with-react";
import { enGb } from "@use-puncta/with-en-gb";
import { esEs } from "@use-puncta/with-es-es";

console.log(
  renderToString([
    createElement(Puncta, { locale: enGb, key: "en-gb" }),
    createElement(Puncta, { locale: esEs, key: "es-es" }),
  ]),
);
