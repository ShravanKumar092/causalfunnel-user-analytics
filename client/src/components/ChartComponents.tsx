import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import './ChartComponents.css';

const PIE_COLORS = ['#10b981', '#4f46e5'];

/**
 * Donut chart showing breakdown of Page Views vs Clicks
 */
export const EventDistributionDonut = ({ data = [] }) => {
  if (!data || data.length === 0 || data.every((d) => d.count === 0)) {
    return (
      <div className="chart-empty">
        <p>No event distribution data yet.</p>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    name: item.name || item.event_type,
    value: item.count
  }));

  return (
    <div className="chart-container donut-chart-container">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={95}
            paddingAngle={4}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={PIE_COLORS[index % PIE_COLORS.length]}
                stroke="#ffffff"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [`${value.toLocaleString()} events`, name]}
            contentStyle={{
              backgroundColor: '#0f172a',
              borderRadius: '8px',
              border: 'none',
              color: '#ffffff',
              fontSize: '12px'
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(val) => <span className="legend-label">{val}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Area chart showing hourly/daily interaction trends
 */
export const ActivityTimelineChart = ({ data = [] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-empty">
        <p>No activity recorded in the timeline period yet.</p>
      </div>
    );
  }

  return (
    <div className="chart-container area-chart-container">
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPageViews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="time"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            tickFormatter={(val) => (val && val.includes(' ') ? val.split(' ')[1] : val)}
          />
          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderRadius: '8px',
              border: 'none',
              color: '#ffffff',
              fontSize: '12px'
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(val) => <span className="legend-label">{val}</span>}
          />
          <Area
            type="monotone"
            dataKey="page_views"
            name="Page Views"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorPageViews)"
          />
          <Area
            type="monotone"
            dataKey="clicks"
            name="Clicks"
            stroke="#4f46e5"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorClicks)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
