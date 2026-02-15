interface ChartLabelProps {
  color?: string;
  offsetY?: number;
}

export function createChartLabel({ color = 'hsl(var(--foreground))', offsetY = -12 }: ChartLabelProps = {}) {
  return function ChartLabel(props: any) {
    const { x, y, value } = props;
    if (value == null || x == null || y == null) return null;

    const text = typeof value === 'number' ? value.toFixed(1) : String(value);
    const width = text.length * 5.5 + 6;
    const height = 13;
    const tx = x;
    const ty = y + offsetY;

    return (
      <g>
        <rect
          x={tx - width / 2}
          y={ty - height / 2 - 1}
          width={width}
          height={height}
          rx={3}
          fill="hsl(var(--card))"
          fillOpacity={0.95}
          stroke="hsl(var(--border))"
          strokeWidth={1}
          strokeOpacity={0.5}
        />
        <text
          x={tx}
          y={ty + 3}
          textAnchor="middle"
          fontSize={9}
          fill={color}
          fillOpacity={0.9}
        >
          {text}
        </text>
      </g>
    );
  };
}
