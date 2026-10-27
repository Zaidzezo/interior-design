import { getCatalog, Kind } from "./catalog";
import { Floor, Item } from "./model";
import { bounds, distance, area } from "./geometry";
export const escapeXml = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export function furnitureSvg(kind: Kind, color: string, w = 180, h = 140) {
  const stroke = "#514e46";
  const rect = (
    x: number,
    y: number,
    a: number,
    b: number,
    fill: string,
    r = 5,
    extra = "",
  ) =>
    `<rect x="${x}" y="${y}" width="${a}" height="${b}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="1.4" ${extra}/>`;
  const line = (x: number, y: number, x2: number, y2: number) =>
    `<path d="M${x} ${y}L${x2} ${y2}" stroke="${stroke}" stroke-width="1" opacity=".4"/>`;
  const circle = (x: number, y: number, r: number, fill: string) =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="1.2"/>`;
  let body = "";
  if (kind === "stairs") {
    body =
      rect(2, 2, 96, 96, color, 1) +
      Array.from({ length: 12 }, (_, i) =>
        line(3, i * 8 + 3, 97, i * 8 + 3),
      ).join("") +
      '<path d="M50 92V10M42 20L50 10L58 20" fill="none" stroke="#625744" stroke-width="2"/>';
  } else if (kind === "bed") {
    body =
      rect(6, 2, 88, 96, "#94785c", 3) +
      rect(9, 8, 82, 86, "#f4f0e6", 5) +
      rect(12, 11, 35, 18, "#fffdf6", 6) +
      rect(53, 11, 35, 18, "#fffdf6", 6) +
      rect(10, 36, 80, 57, color, 2) +
      rect(10, 82, 80, 11, "#eee9dd", 2) +
      line(15, 40, 15, 79) +
      line(85, 40, 85, 79) +
      line(13, 46, 87, 46);
  } else if (kind === "sofa") {
    body =
      rect(2, 2, 96, 96, color, 9) +
      rect(10, 17, 80, 75, color, 6) +
      [0, 1, 2]
        .map(
          (i) =>
            rect(13 + i * 25, 25, 23, 60, "#e8e5da", 5) +
            rect(15 + i * 25, 10, 19, 20, color, 5),
        )
        .join("") +
      rect(2, 20, 11, 75, color, 4) +
      rect(87, 20, 11, 75, color, 4);
  } else if (kind === "chair") {
    body =
      rect(10, 5, 80, 90, "#8e755c", 12) +
      rect(16, 14, 68, 65, color, 12) +
      rect(17, 5, 66, 21, color, 9) +
      rect(6, 24, 13, 55, color, 5) +
      rect(81, 24, 13, 55, color, 5) +
      rect(22, 32, 56, 43, "#e6e5d7", 10);
  } else if (kind === "table" || kind === "desk") {
    body =
      rect(3, 5, 94, 90, "#84664a", 5) +
      rect(6, 7, 88, 86, color, 4) +
      [23, 43, 63, 83].map((x) => line(x, 10, x + 3, 90)).join("");
    if (kind === "desk")
      body +=
        rect(28, 12, 45, 30, "#3c4853", 3) +
        rect(24, 48, 52, 16, "#ebe6dc", 3) +
        circle(84, 56, 5, "#687b75");
    else
      body += rect(38, 35, 24, 30, "#e1d7c3", 1) + circle(50, 50, 9, "#7d9273");
  } else if (kind === "cabinet" || kind === "shelf") {
    body =
      rect(2, 2, 96, 96, color, 2) +
      [32, 65].map((x) => line(x, 5, x, 95)).join("") +
      [18, 50, 81].map((x) => rect(x - 4, 45, 8, 3, "#675440", 1)).join("");
    if (kind === "shelf")
      body += [16, 35, 55, 73]
        .map(
          (y) =>
            line(3, y, 97, y) +
            [12, 23, 34, 49, 60, 78]
              .map((x, i) =>
                rect(
                  x,
                  y - 12,
                  8,
                  11,
                  ["#a4b4a0", "#ddd5bd", "#8d9eae"][i % 3],
                  0,
                ),
              )
              .join(""),
        )
        .join("");
  } else if (kind === "stove") {
    body =
      rect(1, 1, 98, 98, "#626967", 3) +
      [
        [25, 25],
        [75, 25],
        [25, 70],
        [75, 70],
      ]
        .map(
          ([x, y]) => circle(x, y, 17, "#303a3b") + circle(x, y, 11, "#45504f"),
        )
        .join("") +
      [30, 45, 60, 75].map((x) => circle(x, 94, 3, "#d2d3c9")).join("");
  } else if (kind === "sink") {
    body =
      rect(1, 1, 98, 98, color, 3) +
      rect(9, 17, 82, 72, "#d3dbd7", 13) +
      rect(15, 24, 70, 59, "#eaf0ed", 12) +
      circle(50, 65, 5, "#a9b6b1") +
      rect(46, 4, 8, 35, "#9faeac", 4);
  } else if (kind === "bath") {
    body =
      rect(2, 2, 96, 96, "#f9faf5", 26) +
      rect(12, 9, 76, 82, "#e8eeeb", 25) +
      rect(17, 14, 66, 70, "#f7f9f4", 24) +
      circle(50, 24, 4, "#a6b1ac") +
      rect(45, 3, 10, 15, "#adb6b4", 3);
  } else if (kind === "toilet") {
    body =
      rect(14, 3, 72, 25, "#e9eee9", 7) +
      `<ellipse cx="50" cy="62" rx="34" ry="35" fill="#f9fcf8" stroke="${stroke}" stroke-width="1.4"/><ellipse cx="50" cy="62" rx="23" ry="25" fill="#dce4df" stroke="#b5bfba"/>` +
      rect(44, 10, 12, 4, "#a4ada8", 2);
  } else if (kind === "shower") {
    body =
      rect(2, 2, 96, 96, "#c7d8d3", 2) +
      rect(7, 7, 86, 86, "#e5eeea", 2) +
      line(10, 10, 90, 90) +
      line(90, 10, 10, 90) +
      circle(50, 50, 6, "#aabcb6") +
      rect(5, 2, 90, 4, "#8db4b0", 1);
  } else if (kind === "fridge") {
    body =
      rect(2, 2, 96, 96, "#b5bfba", 4) +
      rect(5, 4, 90, 90, "#dfe4de", 3) +
      line(50, 4, 50, 96) +
      rect(40, 34, 4, 33, "#8e9b95", 2) +
      rect(56, 34, 4, 33, "#8e9b95", 2);
  } else if (kind === "rug") {
    body =
      rect(1, 1, 98, 98, color, 1) +
      rect(6, 6, 88, 88, color, 0, 'stroke-dasharray="2 2"') +
      Array.from(
        { length: 20 },
        (_, i) =>
          `<path d="M10 ${10 + i * 4}L90 ${10 + i * 4}" stroke="#fff" stroke-opacity=".22" stroke-width="1"/>`,
      ).join("");
  } else if (kind === "plant") {
    body =
      circle(50, 50, 23, "#ac8866") +
      Array.from(
        { length: 9 },
        (_, i) =>
          `<ellipse cx="50" cy="29" rx="12" ry="26" fill="${["#65836b", "#809877", "#94a785"][i % 3]}" stroke="#53715c" stroke-width="1" transform="rotate(${i * 40} 50 50)"/>`,
      ).join("") +
      circle(50, 50, 9, "#789469");
  } else if (kind === "lamp") {
    body =
      circle(50, 50, 43, "#a68b58") +
      circle(50, 50, 39, "#efe4c6") +
      circle(50, 50, 9, "#d2ba7a") +
      line(50, 8, 50, 40) +
      line(50, 60, 50, 92);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 100 100" preserveAspectRatio="none">${body}</svg>`;
}
export const svgData = (s: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`;
export function woodSvg(color = "#dfc8a5", tile = false) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="${color}"/>${tile ? '<path d="M0 0H96V96H0ZM48 0V96M0 48H96" fill="none" stroke="#7e9288" stroke-opacity=".26"/>' : Array.from({ length: 8 }, (_, i) => `<rect x="${i % 2 ? 24 : 0}" y="${i * 12}" width="96" height="12" fill="${i % 3 === 0 ? "#fff" : "#9c774c"}" opacity=".055"/><path d="M0 ${i * 12}H96 M${i % 2 ? 24 : 68} ${i * 12}v12" stroke="#896f52" stroke-width=".6" opacity=".16"/><path d="M0 ${i * 12 + 4}Q35 ${i * 12 + 2} 96 ${i * 12 + 5}" fill="none" stroke="#fff" opacity=".15"/>`).join("")}</svg>`;
}
export function planSvg(
  f: Floor,
  options = { grid: false, labels: true, measurements: true },
) {
  const pts = [
    ...f.rooms.flatMap((r) => r.points),
    ...f.walls.flatMap((w) => [w.a, w.b]),
    ...(f.references ?? []).flatMap((r) => [
      { x: r.x, y: r.y },
      { x: r.x + r.width, y: r.y + r.depth },
    ]),
  ];
  if (!pts.length)
    return '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"/>';
  const b = bounds(pts),
    scale = 80;
  const paths = f.rooms
    .map(
      (r) =>
        `<polygon points="${r.points.map((p) => `${p.x},${p.y}`).join(" ")}" fill="url(#floor-${escapeXml(r.id)})"/>`,
    )
    .join("");
  const defs = f.rooms
    .map(
      (r) =>
        `<pattern id="floor-${escapeXml(r.id)}" patternUnits="userSpaceOnUse" width="1.2" height="1.2"><image href="${svgData(woodSvg(r.color, r.material === "tile"))}" width="1.2" height="1.2"/></pattern>`,
    )
    .join("");
  const walls = f.walls
    .map(
      (w) =>
        `<path d="M${w.a.x} ${w.a.y}L${w.b.x} ${w.b.y}" stroke="${w.color}" stroke-width="${w.thickness}"/>`,
    )
    .join("");
  const openings = f.openings
    .map((o) => {
      const w = f.walls.find((w) => w.id === o.wallId);
      if (!w) return "";
      const l = distance(w.a, w.b),
        a = (Math.atan2(w.b.y - w.a.y, w.b.x - w.a.x) * 180) / Math.PI;
      return `<g transform="translate(${w.a.x + ((w.b.x - w.a.x) * o.offset) / l} ${w.a.y + ((w.b.y - w.a.y) * o.offset) / l}) rotate(${a})"><path d="M0 0H${o.width}" stroke="#f3f1e9" stroke-width="${w.thickness + 0.02}"/>${o.kind === "door" ? `<path d="M0 0V${o.width} M0 ${o.width}A${o.width} ${o.width} 0 0 0 ${o.width} 0" fill="none" stroke="#438d87" stroke-width=".02"/>` : `<rect x="0" y="-.04" width="${o.width}" height=".08" fill="#dfedf5" stroke="#6095b8" stroke-width=".02"/>`}</g>`;
    })
    .join("");
  const items = [...f.items]
    .sort(
      (a, b) =>
        (getCatalog(a.catalogId).kind === "rug" ? -1 : 0) -
        (getCatalog(b.catalogId).kind === "rug" ? -1 : 0),
    )
    .filter((i) => !i.hidden)
    .map(
      (i) =>
        `<g transform="translate(${i.x} ${i.y}) rotate(${i.rotation}) scale(${i.flipX ? -1 : 1} 1)"><image x="${-i.width / 2}" y="${-i.depth / 2}" width="${i.width}" height="${i.depth}" href="${svgData(furnitureSvg(getCatalog(i.catalogId).kind, i.color))}"/></g>`,
    )
    .join("");
  const labels = options.labels
    ? f.rooms
        .map((r) => {
          const b = bounds(r.points);
          return `<text x="${b.x + b.width / 2}" y="${b.y + b.depth / 2}" text-anchor="middle" font-family="Arial" font-size=".17" fill="#334155">${escapeXml(r.name)}<tspan x="${b.x + b.width / 2}" dy=".24" font-size=".14">${area(r.points).toFixed(1)} m²</tspan></text>`;
        })
        .join("")
    : "";
  const dimensions = options.measurements
    ? `<g fill="none" stroke="#8b96a4" stroke-width=".012"><path d="M${b.x} ${b.y - 0.45}H${b.x + b.width}M${b.x} ${b.y - 0.6}V${b.y - 0.3}M${b.x + b.width} ${b.y - 0.6}V${b.y - 0.3}M${b.x - 0.5} ${b.y}V${b.y + b.depth}"/></g><g fill="#6b7788" font-family="Arial" font-size=".16"><text x="${b.x + b.width / 2}" y="${b.y - 0.65}" text-anchor="middle">${b.width.toFixed(2)} m</text><text x="${b.x - 0.72}" y="${b.y + b.depth / 2}" transform="rotate(-90 ${b.x - 0.72} ${b.y + b.depth / 2})" text-anchor="middle">${b.depth.toFixed(2)} m</text></g>`
    : "";
  const references = (f.references ?? [])
    .map(
      (r) =>
        `<image href="${r.dataUrl}" x="${r.x}" y="${r.y}" width="${r.width}" height="${r.depth}" opacity="${r.opacity}"/>`,
    )
    .join("");
  const notes = f.annotations
    .map(
      (a) =>
        `<path d="M${a.a.x} ${a.a.y}L${a.b.x} ${a.b.y}" fill="none" stroke="#7567bd" stroke-width=".02"/><text x="${(a.a.x + a.b.x) / 2}" y="${(a.a.y + a.b.y) / 2 - 0.1}" fill="#7567bd" font-family="Arial" font-size=".17">${escapeXml(a.kind === "measure" ? `${distance(a.a, a.b).toFixed(2)} m` : a.text)}</text>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${(b.width + 2) * scale}" height="${(b.depth + 2) * scale}" viewBox="${b.x - 1} ${b.y - 1} ${b.width + 2} ${b.depth + 2}"><defs>${defs}</defs>${options.grid ? '<rect x="-100" y="-100" width="200" height="200" fill="#eef0f4"/>' : ""}${references}${paths}${walls}${openings}${items}${labels}${dimensions}${notes}</svg>`;
}
