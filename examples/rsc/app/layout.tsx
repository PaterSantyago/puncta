import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB">
      <head>
        <title>Puncta RSC consumer</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
