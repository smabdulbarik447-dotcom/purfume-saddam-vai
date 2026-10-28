// Logo upload kora thakle logo, na thakle brand er prothom okkhor + nam
export default function Brand({ s, className = "" }) {
  if (s.logo) {
    return (
      <div className={`brand ${className}`}>
        <img src={s.logo} alt={s.brand} className="brand-logo" />
      </div>
    );
  }
  return (
    <div className={`brand ${className}`}>
      <span className="brand-mark">{s.brand[0]}</span>
      <div>
        <b>{s.brand.toUpperCase()}</b>
        <small>PREMIUM • {s.domain}</small>
      </div>
    </div>
  );
}
