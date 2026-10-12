import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Eye, Layers, Sliders, Info, MapPin } from 'lucide-react';
import { formatDate } from '../utils/formatters';
import './HeatmapCanvas.css';

export const HeatmapCanvas = ({ clicks = [], pageUrl = '' }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [mode, setMode] = useState('both'); // 'heat', 'markers', 'both'
  const [radius, setRadius] = useState(25);
  const [hoveredClick, setHoveredClick] = useState(null);
  const [selectedClick, setSelectedClick] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Standard representation dimensions (16:9 or 16:10 standard desktop viewport representation)
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 960, height: 580 });

  // Compute normalized coordinates for all clicks
  const normalizedClicks = useMemo(() => {
    return clicks
      .filter((c) => {
        return (
          typeof c.click_x === 'number' &&
          typeof c.click_y === 'number' &&
          c.viewport_width > 0 &&
          c.viewport_height > 0
        );
      })
      .map((c, index) => {
        const normX = Math.min(1, Math.max(0, c.click_x / c.viewport_width));
        const normY = Math.min(1, Math.max(0, c.click_y / c.viewport_height));
        return {
          ...c,
          index: index + 1,
          normX,
          normY
        };
      });
  }, [clicks]);

  // Handle container resizing to keep canvas responsive
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        // Keep a realistic 16:10 desktop browser viewport ratio
        const computedWidth = Math.max(480, Math.min(1100, containerWidth));
        const computedHeight = Math.round(computedWidth * 0.62);
        setCanvasDimensions({ width: computedWidth, height: computedHeight });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Draw Heatmap and Markers on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvasDimensions;

    // Set physical canvas pixel density
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw viewport wireframe grid background
    drawViewportWireframe(ctx, width, height);

    if (normalizedClicks.length === 0) return;

    // 1. Draw Heat Density Glow
    if (mode === 'heat' || mode === 'both') {
      drawHeatDensity(ctx, width, height, normalizedClicks, radius);
    }

    // 2. Draw Precision Click Markers
    if (mode === 'markers' || mode === 'both') {
      drawMarkers(ctx, width, height, normalizedClicks, selectedClick, hoveredClick);
    }
  }, [canvasDimensions, normalizedClicks, mode, radius, selectedClick, hoveredClick]);

  /**
   * Draw browser layout wireframe to represent header, hero, and content zones
   */
  const drawViewportWireframe = (ctx, w, h) => {
    // Canvas background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;

    // Subtle 40px grid
    for (let x = 0; x < w; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Simulated Webpage Structure guides
    // Nav bar zone (top 10%)
    ctx.fillStyle = 'rgba(241, 245, 249, 0.7)';
    ctx.fillRect(0, 0, w, h * 0.1);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(0, 0, w, h * 0.1);

    // Hero banner zone (10% to 42%)
    ctx.fillStyle = 'rgba(238, 242, 255, 0.45)';
    ctx.fillRect(w * 0.1, h * 0.14, w * 0.8, h * 0.26);
    ctx.strokeStyle = '#c7d2fe';
    ctx.strokeRect(w * 0.1, h * 0.14, w * 0.8, h * 0.26);

    // Product cards zone (48% to 92%)
    const cardW = w * 0.23;
    const cardH = h * 0.38;
    const startY = h * 0.46;
    for (let i = 0; i < 3; i++) {
      const startX = w * 0.1 + i * (cardW + w * 0.055);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(startX, startY, cardW, cardH);
      ctx.strokeStyle = '#e2e8f0';
      ctx.strokeRect(startX, startY, cardW, cardH);
    }
  };

  /**
   * Draw glowing radial heat density
   */
  const drawHeatDensity = (ctx, w, h, points, r) => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');

    // Create alpha accumulation mask
    points.forEach((p) => {
      const cx = p.normX * w;
      const cy = p.normY * h;

      const radialGrad = tempCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
      radialGrad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
      radialGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.25)');
      radialGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      tempCtx.fillStyle = radialGrad;
      tempCtx.beginPath();
      tempCtx.arc(cx, cy, r, 0, Math.PI * 2);
      tempCtx.fill();
    });

    // Colorize alpha mask with thermal gradient
    const imgData = tempCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha > 0) {
        // Color mapping from alpha: Blue -> Cyan -> Green -> Yellow -> Red
        const factor = alpha / 255;
        let rVal = 0;
        let gVal = 0;
        let bVal = 0;

        if (factor < 0.25) {
          // Blue to Cyan
          rVal = 0;
          gVal = Math.round(4 * factor * 255);
          bVal = 255;
        } else if (factor < 0.5) {
          // Cyan to Green
          rVal = 0;
          gVal = 255;
          bVal = Math.round((1 - 4 * (factor - 0.25)) * 255);
        } else if (factor < 0.75) {
          // Green to Yellow
          rVal = Math.round(4 * (factor - 0.5) * 255);
          gVal = 255;
          bVal = 0;
        } else {
          // Yellow to Red
          rVal = 255;
          gVal = Math.round((1 - 4 * (factor - 0.75)) * 255);
          bVal = 0;
        }

        data[i] = rVal;
        data[i + 1] = gVal;
        data[i + 2] = bVal;
        data[i + 3] = Math.round(factor * 190); // soften max opacity
      }
    }

    tempCtx.putImageData(imgData, 0, 0);
    ctx.drawImage(tempCanvas, 0, 0);
  };

  /**
   * Draw clickable pinpoint markers
   */
  const drawMarkers = (ctx, w, h, points, selected, hovered) => {
    points.forEach((p) => {
      const cx = p.normX * w;
      const cy = p.normY * h;
      const isSelected = selected && selected._id === p._id;
      const isHovered = hovered && hovered._id === p._id;

      // Outer glow ring
      ctx.beginPath();
      ctx.arc(cx, cy, isSelected || isHovered ? 12 : 7, 0, Math.PI * 2);
      ctx.fillStyle = isSelected
        ? 'rgba(239, 68, 68, 0.4)'
        : isHovered
        ? 'rgba(79, 70, 229, 0.4)'
        : 'rgba(79, 70, 229, 0.2)';
      ctx.fill();

      // Pin center dot
      ctx.beginPath();
      ctx.arc(cx, cy, isSelected || isHovered ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#ef4444' : '#4f46e5';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    });
  };

  /**
   * Handle mouse move over canvas for tooltips
   */
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const { width, height } = canvasDimensions;

    // Check hit test against points (tolerance radius = 14px)
    let found = null;
    for (let i = normalizedClicks.length - 1; i >= 0; i--) {
      const p = normalizedClicks[i];
      const cx = p.normX * width;
      const cy = p.normY * height;
      const dist = Math.hypot(mouseX - cx, mouseY - cy);
      if (dist <= 14) {
        found = p;
        break;
      }
    }

    setHoveredClick(found);
    if (found) {
      setTooltipPos({
        x: e.clientX,
        y: e.clientY
      });
    }
  };

  const handleClick = () => {
    if (hoveredClick) {
      setSelectedClick(hoveredClick);
    } else {
      setSelectedClick(null);
    }
  };

  return (
    <div className="heatmap-wrapper" ref={containerRef}>
      {/* Canvas Header & Visual Mode Toolbar */}
      <div className="heatmap-toolbar card">
        <div className="toolbar-left">
          <div className="browser-frame-dots">
            <span className="dot dot-red"></span>
            <span className="dot dot-yellow"></span>
            <span className="dot dot-green"></span>
          </div>
          <div className="browser-address-bar" title={pageUrl}>
            <span className="address-protocol">https://</span>
            <span className="address-text">{pageUrl || 'No page selected'}</span>
          </div>
        </div>

        <div className="toolbar-right">
          {/* View Modes */}
          <div className="mode-toggle-group">
            <button
              className={`mode-btn ${mode === 'both' ? 'active' : ''}`}
              onClick={() => setMode('both')}
              title="Show both heatmap density and click markers"
            >
              <Layers size={14} />
              <span>Hybrid</span>
            </button>
            <button
              className={`mode-btn ${mode === 'heat' ? 'active' : ''}`}
              onClick={() => setMode('heat')}
              title="Thermal heat density glow"
            >
              <Eye size={14} />
              <span>Heat Glow</span>
            </button>
            <button
              className={`mode-btn ${mode === 'markers' ? 'active' : ''}`}
              onClick={() => setMode('markers')}
              title="Discrete click markers"
            >
              <MapPin size={14} />
              <span>Markers</span>
            </button>
          </div>

          {/* Blur Radius Slider */}
          {(mode === 'heat' || mode === 'both') && (
            <div className="radius-control">
              <Sliders size={13} className="text-muted" />
              <input
                type="range"
                min="15"
                max="45"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="radius-slider"
                title={`Heat radius: ${radius}px`}
              />
              <span className="radius-val">{radius}px</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Viewport Canvas Box */}
      <div className="canvas-frame card">
        <canvas
          ref={canvasRef}
          style={{ width: canvasDimensions.width, height: canvasDimensions.height }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredClick(null)}
          onClick={handleClick}
          className="heatmap-canvas-el"
        />

        {/* Informational Watermark Pill */}
        <div className="viewport-watermark">
          <Info size={12} />
          <span>Schematic viewport map (not a page screenshot) · normalized click positions</span>
        </div>
      </div>

      {/* Hover Floating Tooltip */}
      {hoveredClick && (
        <div
          className="click-tooltip card"
          style={{
            position: 'fixed',
            left: `${tooltipPos.x + 14}px`,
            top: `${tooltipPos.y + 14}px`,
            pointerEvents: 'none',
            zIndex: 1000
          }}
        >
          <div className="tooltip-title">
            <span>Click #{hoveredClick.index}</span>
            <span className="tooltip-time">{formatDate(hoveredClick.timestamp)}</span>
          </div>
          <div className="tooltip-coords">
            <div>
              <strong>Raw:</strong> ({hoveredClick.click_x}px, {hoveredClick.click_y}px)
            </div>
            <div>
              <strong>Viewport:</strong> {hoveredClick.viewport_width} × {hoveredClick.viewport_height}
            </div>
            <div>
              <strong>Normalized:</strong> {(hoveredClick.normX * 100).toFixed(1)}% X,{' '}
              {(hoveredClick.normY * 100).toFixed(1)}% Y
            </div>
          </div>
        </div>
      )}

      {/* Selected Click Inspector Drawer / Card */}
      {selectedClick && (
        <div className="selected-click-card card">
          <div className="selected-header">
            <h4>Selected Click Interaction #{selectedClick.index}</h4>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedClick(null)}>
              Dismiss
            </button>
          </div>
          <div className="selected-grid">
            <div className="selected-stat">
              <span className="stat-label">Session ID</span>
              <span className="stat-val font-mono">{selectedClick.session_id}</span>
            </div>
            <div className="selected-stat">
              <span className="stat-label">Timestamp</span>
              <span className="stat-val">{formatDate(selectedClick.timestamp)}</span>
            </div>
            <div className="selected-stat">
              <span className="stat-label">Native Coordinates</span>
              <span className="stat-val font-mono">
                X: {selectedClick.click_x}px, Y: {selectedClick.click_y}px
              </span>
            </div>
            <div className="selected-stat">
              <span className="stat-label">Client Viewport</span>
              <span className="stat-val font-mono">
                {selectedClick.viewport_width} × {selectedClick.viewport_height}
              </span>
            </div>
            <div className="selected-stat">
              <span className="stat-label">Normalized Position</span>
              <span className="stat-val font-mono">
                {(selectedClick.normX * 100).toFixed(2)}% Width, {(selectedClick.normY * 100).toFixed(2)}% Height
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeatmapCanvas;
