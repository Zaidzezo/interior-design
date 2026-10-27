import { catalog, getCatalog, Kind } from "./catalog";
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
export function furnitureSvg(
  key: string,
  color: string,
  w = 180,
  h = 140,
  realistic = true,
  finish = "original",
) {
  const entry = catalog.find((c) => c.id === key),
    kind = entry?.kind ?? (key as Kind);
  const v = entry?.variant ?? 0,
    name = entry?.name.toLowerCase() ?? "";
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
  if (entry) {
    const slats = (
      count: number,
      x: number,
      y: number,
      width: number,
      height: number,
    ) =>
      Array.from({ length: count }, (_, i) =>
        rect(x + (i * width) / count, y, width / count - 2, height, color, 2),
      ).join("");
    if (kind === "sofa") {
      const seats = /two|loveseat/.test(name) ? 2 : /bench/.test(name) ? 4 : 3;
      body =
        rect(1, 1, 98, 52, color, 6) +
        slats(seats, 10, 14, 80, 34) +
        rect(1, 4, 8, 48, color, 3) +
        rect(91, 4, 8, 48, color, 3);
      if (entry.footprint === "sectional")
        body +=
          rect(66, 40, 33, 59, color, 6) + rect(71, 48, 23, 43, "#e8e5da", 4);
      else
        body =
          body.replace(/height="52"/, 'height="98"') +
          slats(seats, 10, 55, 80, 36);
      body += Array.from({ length: (v % 4) + 1 }, (_, i) =>
        rect(
          14 + i * 19,
          18,
          12 + (v % 3),
          13,
          "#eee9df",
          3,
          `transform="rotate(${v * 5} ${20 + i * 19} 24)"`,
        ),
      ).join("");
      if (/bench/.test(name))
        body = rect(1, 1, 98, 98, "#8d7455", 2) + slats(7, 5, 4, 90, 92);
    } else if (kind === "chair") {
      if (/stool/.test(name))
        body =
          circle(50, 50, 46, color) +
          circle(50, 50, 33, "#e8e1d3") +
          line(18, 18, 82, 82) +
          line(82, 18, 18, 82);
      else if (/task/.test(name))
        body =
          Array.from(
            { length: 5 },
            (_, i) =>
              `<path d="M50 55L50 96" transform="rotate(${i * 72} 50 55)" stroke="#5d6770" stroke-width="5"/>`,
          ).join("") +
          rect(20, 12, 60, 18, color, 7) +
          rect(24, 35, 52, 43, color, 10) +
          rect(10, 30, 8, 40, "#5d6770") +
          rect(82, 30, 8, 40, "#5d6770");
      else
        body =
          rect(9, 3, 82, 18, color, 3 + (v % 9)) +
          rect(16, 29, 68, 60, color, 5 + (v % 12)) +
          slats((v % 5) + 2, 15, 4, 70, 12) +
          (/dining|classroom/.test(name)
            ? ""
            : rect(2, 25, 10, 65, color, 4) + rect(88, 25, 10, 65, color, 4));
    } else if (kind === "bed") {
      const pillows = /single|trundle/.test(name) ? 1 : 2;
      body =
        rect(2, 2, 96, 96, "#927456", v + 1) +
        rect(7, 8, 86, 85, "#f4f0e6", 5) +
        Array.from({ length: pillows }, (_, i) =>
          rect(12 + i * 42, 12, pillows === 1 ? 76 : 34, 19, "#fffdf6", 3 + v),
        ).join("") +
        rect(8, 39, 84, 54, color, 2) +
        Array.from({ length: v + 1 }, (_, i) =>
          line(12, 48 + i * 6, 88, 48 + i * 6),
        ).join("");
    } else if (kind === "table" || kind === "desk") {
      body =
        entry.footprint === "ellipse"
          ? circle(50, 50, 48, color)
          : rect(2, 2, 96, 96, color, 2 + v * 2);
      if (/nested/.test(name))
        body = rect(2, 2, 67, 67, color, 4) + rect(49, 49, 49, 49, color, 4);
      if (kind === "desk")
        body +=
          Array.from({ length: /dual/.test(name) ? 2 : 1 }, (_, i) =>
            rect(20 + i * 35, 10, 32, 24, "#46596a", 2),
          ).join("") +
          rect(25, 44, 49, 13, "#ece8df", 2) +
          circle(83, 50, 5, "#687b75") +
          slats((v % 3) + 1, 6, 76, 25, 18);
      else
        body +=
          Array.from({ length: (v % 5) + 1 }, (_, i) =>
            circle(20 + i * 14, 45 + (i % 2) * 13, 4, "#e8decc"),
          ).join("") + line(9, 15 + v * 3, 91, 15 + v * 3);
    } else if (kind === "cabinet" || kind === "shelf" || kind === "fridge") {
      const panels = (v % 5) + 1;
      body =
        rect(1, 1, 98, 98, color, 2) +
        Array.from(
          { length: panels },
          (_, i) =>
            rect(4 + (i * 92) / panels, 4, 92 / panels - 2, 91, color, 1) +
            rect(8 + (i * 92) / panels, 43, 4, 14, "#665747", 1),
        ).join("");
      if (kind === "shelf")
        body += slats(5 + v, 7, 8, 86, 65) + line(5, 76, 95, 76);
      if (/island|prep|peninsula/.test(name))
        body +=
          rect(8, 12, 84, 62, "#e3ddce", 1) + circle(75, 45, 12, "#d2dcd6");
    } else if (kind === "sink") {
      const basins = /double/.test(name) ? 2 : 1;
      body =
        rect(1, 1, 98, 98, color, 2) +
        Array.from(
          { length: basins },
          (_, i) =>
            rect(
              8 + i * 46,
              20,
              basins === 2 ? 39 : 84,
              68,
              "#e9eeeb",
              5 + v * 3,
            ) + circle(27 + i * 46, 66, 4, "#a6b1ac"),
        ).join("") +
        rect(44, 3, 8, 32, "#9faeac", 2) +
        line(10, 10 + v, 90, 10 + v);
    } else if (kind === "stove") {
      body =
        rect(1, 1, 98, 98, color, 3) +
        Array.from(
          { length: v === 3 ? 6 : 4 },
          (_, i) =>
            circle(
              20 + (i % 2) * 55,
              18 + Math.floor(i / 2) * 28,
              10 + v,
              "#354342",
            ) +
            circle(
              20 + (i % 2) * 55,
              18 + Math.floor(i / 2) * 28,
              6,
              "#82908c",
            ),
        ).join("") +
        slats(4 + v, 12, 88, 76, 7);
    } else if (kind === "plant") {
      body =
        circle(50, 50, 22, "#ac8866") +
        Array.from(
          { length: 5 + v },
          (_, i) =>
            `<ellipse cx="50" cy="28" rx="${6 + v}" ry="${19 + v}" fill="${color}" stroke="#53715c" transform="rotate(${(i * 360) / (5 + v)} 50 50)"/>`,
        ).join("");
    } else if (kind === "rug") {
      body =
        entry.footprint === "ellipse"
          ? circle(50, 50, 49, color)
          : rect(1, 1, 98, 98, color, 1);
      body += Array.from(
        { length: 5 + v },
        (_, i) =>
          `<path d="M${8 + i * 5} 10L${90 - i * 5} 10L${90 - i * 5} 90L${8 + i * 5} 90Z" fill="none" stroke="#807b70" stroke-width=".7"/>`,
      ).join("");
    } else if (kind === "lamp") {
      body =
        circle(50, 50, 43 - v * 3, color) +
        Array.from(
          { length: 3 + v },
          (_, i) =>
            `<path d="M50 50L50 8" transform="rotate(${(i * 360) / (3 + v)} 50 50)" stroke="#a08b62" stroke-width="2"/>`,
        ).join("") +
        circle(50, 50, 8, "#efe4c6");
    } else {
      // Family-specific fixtures retain their plumbing/treads; variants change physical details.
      body += Array.from({ length: v + 1 }, (_, i) =>
        rect(8 + i * 13, 5, 8, 4 + v * 2, "#a7b6b1", 1),
      ).join("");
      if (kind === "bath" && v > 0) body = rect(1, 1, 98, 98, color, 1) + body;
      if (kind === "shower" && v === 1)
        body += '<path d="M95 5L5 95" stroke="#82aaa6" stroke-width="5"/>';
    }
  }
  if (entry) {
    if (kind === "fridge")
      body +=
        rect(4, 82, 92, 14, "#c2ccc7", 1) +
        Array.from({ length: 8 }, (_, i) =>
          line(10 + i * 11, 84, 10 + i * 11, 94),
        ).join("");
    if (/dresser/.test(name))
      body += Array.from({ length: 4 }, (_, i) =>
        line(4, 18 + i * 22, 96, 18 + i * 22),
      ).join("");
    if (/vanity/.test(name))
      body +=
        rect(20, 18, 60, 60, "#edf0eb", 14) + circle(50, 60, 5, "#a6b1ac");
    if (/media/.test(name)) body += rect(24, 18, 52, 48, "#35434a", 1);
    if (/utility/.test(name)) body += line(2, 25, 98, 25) + line(2, 75, 98, 75);
    if (/wardrobe/.test(name))
      body += line(50, 3, 50, 97) + rect(44, 35, 4, 28, "#73624c", 1);
    if (/rolling/.test(name))
      body +=
        circle(8, 8, 6, "#595e5b") +
        circle(92, 8, 6, "#595e5b") +
        circle(8, 92, 6, "#595e5b") +
        circle(92, 92, 6, "#595e5b");
    if (/low square/.test(name))
      body += rect(8, 8, 84, 84, "none", 1) + line(8, 25, 92, 25);
    if (/narrow console/.test(name))
      body +=
        rect(6, 72, 88, 22, "#bba386", 1) + rect(47, 81, 6, 3, "#665747", 1);
    if (/round accent/.test(name))
      body += circle(50, 50, 37, "none") + circle(50, 50, 28, "none");
    if (/wall mounted/.test(name)) body += rect(2, 1, 96, 8, "#6d6b60", 1);
    if (/drafting/.test(name))
      body +=
        rect(12, 12, 74, 60, "#f0e9d5", 1) +
        line(20, 25, 75, 60) +
        line(20, 60, 75, 25);
    if (/children/.test(name))
      body += rect(7, 65, 28, 24, "#c4cdbb", 2) + circle(21, 77, 5, "#e5e3d7");
    if (/counter stool/.test(name))
      body += circle(50, 50, 24, "none") + line(20, 50, 80, 50);
    if (/pedestal/.test(name))
      body =
        circle(50, 45, 44, "#eff2ec") +
        circle(50, 45, 31, "#d5dfd9") +
        rect(45, 5, 10, 28, "#a6b1ac", 2) +
        circle(50, 55, 5, "#a6b1ac");
  }
  if (entry?.footprint === "sectional")
    body = `<defs><clipPath id="section"><path d="M0 0H100V100H65V55H0Z"/></clipPath></defs><g clip-path="url(#section)">${body}</g>`;
  if (!realistic)
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 100 100" preserveAspectRatio="none">${body.replace(/fill="[^"]*"/g, 'fill="none"')}</svg>`;
  if (finish !== "original") {
    const lines = Array.from({ length: 20 }, (_, i) =>
      finish === "marble"
        ? `<path d="M${i * 9} 0Q${i * 7} 50 ${i * 5} 100" stroke="#a3a398" stroke-width=".5" opacity=".2"/>`
        : `<path d="M0 ${i * 5}H100${finish === "rattan" ? `M${i * 5} 0V100` : ""}" stroke="#fff" stroke-width="${finish === "boucle" ? 2 : 0.5}" opacity=".15"/>`,
    ).join("");
    body =
      `<defs><pattern id="finish" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="${color}"/>${lines}</pattern></defs>` +
      body.replaceAll(`fill="${color}"`, 'fill="url(#finish)"');
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><clipPath id="footprint">${entry?.footprint === "ellipse" ? '<ellipse cx="50" cy="50" rx="49" ry="49"/>' : entry?.footprint === "sectional" ? '<path d="M0 0H100V100H65V55H0Z"/>' : '<rect width="100" height="100"/>'}</clipPath><linearGradient id="depth" x2=".3" y2="1"><stop stop-color="#fff" stop-opacity=".30"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#142136" stop-opacity=".24"/></linearGradient><filter id="soft"><feDropShadow dx="1" dy="2" stdDeviation="1" flood-color="#172437" flood-opacity=".22"/></filter></defs><g filter="url(#soft)">${body}</g><rect x="2" y="2" width="96" height="96" rx="6" fill="url(#depth)" clip-path="url(#footprint)" pointer-events="none"/></svg>`;
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
        `<g transform="translate(${i.x} ${i.y}) rotate(${i.rotation}) scale(${i.flipX ? -1 : 1} 1)"><image x="${-i.width / 2}" y="${-i.depth / 2}" width="${i.width}" height="${i.depth}" href="${svgData(furnitureSvg(i.catalogId, i.color, 180, 140, true, i.finish))}"/></g>`,
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
