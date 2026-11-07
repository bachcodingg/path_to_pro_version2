// A training bib in a role's colour (index.css [data-bib]); roles wear them on the overview and
// sign-in pages. Decorative: the name beside it says who it is for.
export function Bib({ number }: { number: number }) {
  return (
    <svg viewBox="0 0 120 148" className="bib-shape" aria-hidden>
      <path d="M34 4h15c3 13 19 13 22 0h15l16 34-5 104c-26 5-54 5-80 0L13 38z" />
      <path className="bib-trim" d="M34 4h15c3 13 19 13 22 0h15M13 38l16 7M107 38l-16 7" />
      <text x="60" y="104" textAnchor="middle">
        {number}
      </text>
    </svg>
  );
}
