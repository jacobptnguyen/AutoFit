export const CHART_COLORS = {
  actual: "#b87a14",
  predicted: "#1fa898",
  ink: "#f2eee6",
  inkSecondary: "#c9c3b5",
  inkMuted: "#a39c8d",
  grid: "#2c2823",
};

export const PLOTLY_FONT = {
  family: "var(--font-plex-mono), monospace",
  color: CHART_COLORS.inkSecondary,
  size: 12,
};

export const basePlotlyLayout: Partial<Plotly.Layout> = {
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: PLOTLY_FONT,
  margin: { t: 24, r: 16, b: 44, l: 56 },
  xaxis: {
    gridcolor: CHART_COLORS.grid,
    zerolinecolor: CHART_COLORS.grid,
    linecolor: CHART_COLORS.grid,
    tickfont: PLOTLY_FONT,
  },
  yaxis: {
    gridcolor: CHART_COLORS.grid,
    zerolinecolor: CHART_COLORS.grid,
    linecolor: CHART_COLORS.grid,
    tickfont: PLOTLY_FONT,
  },
  legend: {
    font: PLOTLY_FONT,
    orientation: "v",
    x: 0,
    xanchor: "left",
    y: -0.3,
    yanchor: "top",
  },
  hoverlabel: {
    bgcolor: "#1d1811",
    bordercolor: "#2c2823",
    font: { ...PLOTLY_FONT, color: CHART_COLORS.ink },
  },
};

export const plotlyConfig: Partial<Plotly.Config> = {
  displayModeBar: false,
  responsive: true,
};
