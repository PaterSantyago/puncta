# @use-puncta/with-react

Technical ESM scaffold for React 19.3 or newer within React 19.
The application supplies React; core is installed automatically.

```tsx
import { Puncta } from "@use-puncta/with-react";

const example = <Puncta locale={{ id: "example" }} />;
```

`Puncta` renders a span with the explicitly supplied locale identifier.
No locales are installed automatically. React DOM is not a dependency.
MIT licensed. Version 0.1.0-alpha.0 is a scaffold, not a stable API.
