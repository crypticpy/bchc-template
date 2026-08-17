import defaultTheme from "tailwindcss/defaultTheme";
import forms from "@tailwindcss/forms";
import typography from "@tailwindcss/typography";

// Colors are CSS variables (RGB channel triples) emitted by _includes/theme.html
// from _data/theme.yml, so the palette is data-driven and alpha modifiers
// (e.g. bg-brand-primary/10) still work.
const rgb = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: [
    "./_layouts/**/*.html",
    "./_includes/**/*.html",
    "./_plugins/**/*.rb",
    "./*.md",
    "./*.html",
    "./catalog/**/*.{md,html}",
    "./cohorts/**/*.{md,html}",
    "./events/**/*.{md,html}",
    "./resources/**/*.{md,html}",
    "./submit/**/*.{md,html}",
    "./setup/**/*.{md,html}",
    "./about/**/*.{md,html}",
    "./assets/js/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: rgb("primary"),
          "primary-dark": rgb("primary-dark"),
          secondary: rgb("secondary"),
          accent: rgb("accent"),
          ink: rgb("ink"),
          muted: rgb("muted"),
          line: rgb("line"),
          "on-dark": rgb("on-dark")
        },
        surface: {
          base: rgb("surface"),
          card: rgb("card")
        }
      },
      fontFamily: {
        heading: ["var(--font-heading)", ...defaultTheme.fontFamily.sans],
        sans: ["var(--font-body)", ...defaultTheme.fontFamily.sans]
      },
      borderRadius: {
        DEFAULT: "var(--radius-sm)",
        md: "var(--radius-sm)",
        lg: "var(--radius-md)",
        xl: "var(--radius-lg)",
        "2xl": "var(--radius-xl)",
        "3xl": "var(--radius-2xl)"
      },
      boxShadow: {
        card: "0 18px 50px -24px rgb(var(--c-ink) / 0.35)",
        subtle: "0 10px 30px -20px rgb(var(--c-primary-dark) / 0.35)"
      },
      typography: () => ({
        DEFAULT: {
          css: {
            "--tw-prose-body": "rgb(var(--c-ink))",
            "--tw-prose-headings": "rgb(var(--c-primary-dark))",
            "--tw-prose-links": "rgb(var(--c-primary))",
            "--tw-prose-bold": "rgb(var(--c-ink))",
            "--tw-prose-quotes": "rgb(var(--c-ink))",
            "--tw-prose-quote-borders": "rgb(var(--c-primary))",
            "--tw-prose-bullets": "rgb(var(--c-primary))",
            "--tw-prose-counters": "rgb(var(--c-primary))",
            "--tw-prose-hr": "rgb(var(--c-line))",
            "--tw-prose-th-borders": "rgb(var(--c-line))",
            "--tw-prose-td-borders": "rgb(var(--c-line))",
            "--tw-prose-code": "rgb(var(--c-primary-dark))",
            "--tw-prose-pre-bg": "rgb(var(--c-primary-dark))",
            "--tw-prose-pre-code": "rgb(var(--c-on-dark))",
            h1: { fontFamily: "var(--font-heading)" },
            h2: { fontFamily: "var(--font-heading)" },
            h3: { fontFamily: "var(--font-heading)" },
            a: { textDecoration: "none", fontWeight: "500", "&:hover": { textDecoration: "underline" } }
          }
        }
      })
    }
  },
  plugins: [forms, typography]
};
