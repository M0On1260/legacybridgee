// graph.js — canvas-based dependency graph renderer

function renderDepGraph(canvasId, result) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = '#181b22';
  ctx.roundRect(0, 0, W, H, 10);
  ctx.fill();

  const nodes = [];

  // Root node
  nodes.push({ id: 'MAIN', label: 'MAIN PROGRAM', x: W / 2, y: 60, color: '#7B6EF6', type: 'main' });

  // View nodes (left side)
  const viewNodes = result.depNodes.filter(n => n.type === 'view');
  viewNodes.forEach((n, i) => {
    const total = viewNodes.length;
    const x = 100;
    const y = 120 + i * (160 / Math.max(total, 1)) + 40;
    nodes.push({ id: n.name, label: n.name, x, y, color: '#3ECFA0', type: 'view' });
  });

  // Subroutine nodes (right side)
  const subNodes = result.depNodes.filter(n => n.type === 'sub');
  subNodes.forEach((n, i) => {
    const total = subNodes.length;
    const x = W - 100;
    const y = 120 + i * (160 / Math.max(total, 1)) + 40;
    nodes.push({ id: n.name, label: n.name, x, y, color: '#F5A623', type: 'sub' });
  });

  // If no deps, show default
  if (nodes.length === 1) {
    nodes.push({ id: 'DB', label: 'ADABAS DB', x: 130, y: 180, color: '#3ECFA0', type: 'view' });
    nodes.push({ id: 'SUB1', label: 'SUBROUTINES', x: W - 130, y: 180, color: '#F5A623', type: 'sub' });
    nodes.push({ id: 'UI', label: 'PRESENTATION', x: W / 2, y: H - 60, color: '#F05C5C', type: 'pres' });
  }

  // Extra: presentation node
  if (!nodes.find(n => n.type === 'pres')) {
    nodes.push({ id: 'PRES', label: 'WRITE / FORMAT', x: W / 2, y: H - 55, color: '#F05C5C', type: 'pres' });
  }

  // Draw edges
  ctx.lineWidth = 1;
  nodes.forEach(n => {
    if (n.id === 'MAIN') return;
    ctx.beginPath();
    ctx.moveTo(W / 2, 60);
    ctx.lineTo(n.x, n.y);
    ctx.strokeStyle = n.color + '44';
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrow
    const angle = Math.atan2(n.y - 60, n.x - W / 2);
    const ax = n.x - Math.cos(angle) * 28;
    const ay = n.y - Math.sin(angle) * 22;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax - 8 * Math.cos(angle - 0.4), ay - 8 * Math.sin(angle - 0.4));
    ctx.lineTo(ax - 8 * Math.cos(angle + 0.4), ay - 8 * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fillStyle = n.color + '88';
    ctx.fill();
  });

  // Draw nodes
  nodes.forEach(n => {
    const isMain = n.type === 'main';
    const rx = isMain ? 70 : 60;
    const ry = isMain ? 20 : 16;

    // Glow
    ctx.shadowColor = n.color;
    ctx.shadowBlur = isMain ? 16 : 8;

    // Box
    ctx.fillStyle = n.color + '22';
    ctx.strokeStyle = n.color + 'aa';
    ctx.lineWidth = isMain ? 1.5 : 1;
    ctx.beginPath();
    ctx.roundRect(n.x - rx, n.y - ry, rx * 2, ry * 2, 8);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Label
    ctx.fillStyle = n.color;
    ctx.font = `${isMain ? '11px' : '10px'} 'Space Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = n.label.length > 12 ? n.label.slice(0, 12) + '…' : n.label;
    ctx.fillText(label, n.x, n.y);

    // Type badge
    if (!isMain) {
      const typeLabels = { view: 'VIEW', sub: 'SUB', pres: 'UI', call: 'CALL' };
      const tl = typeLabels[n.type] || '';
      ctx.font = '8px Space Mono, monospace';
      ctx.fillStyle = n.color + 'aa';
      ctx.fillText(tl, n.x, n.y + ry + 10);
    }
  });

  // Legend
  const legend = [
    { color: '#7B6EF6', label: 'Main program' },
    { color: '#3ECFA0', label: 'Data views' },
    { color: '#F5A623', label: 'Subroutines' },
    { color: '#F05C5C', label: 'Presentation' }
  ];
  legend.forEach((l, i) => {
    const lx = 12 + i * 120;
    const ly = H - 18;
    ctx.fillStyle = l.color;
    ctx.beginPath();
    ctx.arc(lx + 5, ly, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9896B8';
    ctx.font = '10px DM Sans, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(l.label, lx + 14, ly + 1);
  });
}
