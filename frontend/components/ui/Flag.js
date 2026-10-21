export default function Flag({ code, className = "" }) {
  if (!code || code.length !== 2) return null;
  const c = code.toLowerCase();
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w20/${c}.png`}
      srcSet={`https://flagcdn.com/w40/${c}.png 2x`}
      width={20}
      height={15}
      alt=""
      loading="lazy"
      className={`inline-block h-[15px] w-5 shrink-0 rounded-[2px] object-cover ring-1 ring-white/10 ${className}`}
    />
  );
}
