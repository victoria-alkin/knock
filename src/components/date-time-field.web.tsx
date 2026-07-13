type Props = {
  mode: 'date' | 'time';
  value: Date;
  onChange: (d: Date) => void;
};

const pad = (n: number) => String(n).padStart(2, '0');

export function DateTimeField({ mode, value, onChange }: Props) {
  const strValue =
    mode === 'time'
      ? `${pad(value.getHours())}:${pad(value.getMinutes())}`
      : `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
          value.getDate(),
        )}`;

  return (
    <input
      type={mode === 'time' ? 'time' : 'date'}
      value={strValue}
      onChange={(e) => {
        const v = e.target.value;
        if (!v) return;
        const next = new Date(value);
        if (mode === 'time') {
          const [h, m] = v.split(':').map(Number);
          next.setHours(h, m, 0, 0);
        } else {
          const [y, mo, da] = v.split('-').map(Number);
          next.setFullYear(y, mo - 1, da);
        }
        onChange(next);
      }}
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: '14px 16px',
        fontSize: 16,
        color: '#1F1438',
        border: '1px solid #E5DDF5',
        marginBottom: 18,
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: 'Inter',
      }}
    />
  );
}
