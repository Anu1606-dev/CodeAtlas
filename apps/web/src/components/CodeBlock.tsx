import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";

const cache = new Map<string, string>();
const THEMES = { light: "github-light", dark: "github-dark" };

export default function CodeBlock({ code, lang = "text" }: { code: string; lang?: string }) {
  const key = `${lang}:${code}`;
  const [html, setHtml] = useState<string | null>(cache.get(key) ?? null);

  useEffect(() => {
    if (cache.has(key)) {
      setHtml(cache.get(key)!);
      return;
    }
    let cancelled = false;
    codeToHtml(code, { lang, themes: THEMES })
      .catch(() => codeToHtml(code, { lang: "text", themes: THEMES }))
      .then((result) => {
        if (!cancelled) {
          cache.set(key, result);
          setHtml(result);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [key, code, lang]);

  if (!html) {
    return <pre className="text-xs bg-muted rounded p-3 overflow-x-auto whitespace-pre-wrap">{code}</pre>;
  }

  return <div className="text-xs rounded overflow-hidden [&_pre]:p-3 [&_pre]:overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />;
}