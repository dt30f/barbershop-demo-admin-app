export function PlaceholderPanel({
  title,
  subtitle,
  bullets,
}: {
  title: string;
  subtitle: string;
  bullets: string[];
}) {
  return (
    <section className="form-card">
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '2.3rem' }}>{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
      </div>

      <ul className="helper-list">
        {bullets.map((bullet) => (
          <li key={bullet} className="helper-item">
            {bullet}
          </li>
        ))}
      </ul>
    </section>
  );
}
