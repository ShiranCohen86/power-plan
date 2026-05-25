export default function Skeleton({ type = 'text', width, height, style }) {
  return (
    <span
      className={`skeleton skeleton--${type}`}
      style={{ width, height, display: 'block', ...style }}
      aria-hidden="true"
    />
  );
}
