import { blankScene } from "./sample";
import { uid } from "./model";
/** ASCII DXF subset: LINE and closed/open LWPOLYLINE. Coordinates are scaled by explicit units. */
export function importDxf(text: string, metersPerUnit = 0.001) {
  if (text.length > 5_000_000) throw new Error("DXF exceeds 5 MB");
  if (!Number.isFinite(metersPerUnit) || metersPerUnit <= 0)
    throw new Error("Invalid unit scale");
  const rows = text.replace(/\r/g, "").split("\n");
  const pairs: { code: number; value: string }[] = [];
  for (let i = 0; i + 1 < rows.length; i += 2) {
    const code = Number(rows[i].trim());
    if (!Number.isFinite(code)) throw new Error("Invalid DXF group code");
    pairs.push({ code, value: rows[i + 1].trim() });
  }
  const scene = blankScene("Imported DXF plan"),
    floor = scene.floors[0],
    unsupported = new Set<string>();
  let entities = false;
  for (let i = 0; i < pairs.length; i++) {
    if (pairs[i].code === 2 && pairs[i].value === "ENTITIES") {
      entities = true;
      continue;
    }
    if (pairs[i].code === 0 && pairs[i].value === "ENDSEC") {
      entities = false;
      continue;
    }
    if (!entities || pairs[i].code !== 0) continue;
    const type = pairs[i].value;
    let j = i + 1;
    while (j < pairs.length && pairs[j].code !== 0) j++;
    const data = pairs.slice(i + 1, j);
    const val = (code: number) =>
      Number(data.find((v) => v.code === code)?.value ?? 0);
    const add = (x: number, y: number, x2: number, y2: number) => {
      const values = [x, y, x2, y2].map((n) => n * metersPerUnit);
      if (!values.every((v) => Number.isFinite(v) && Math.abs(v) <= 1000))
        throw new Error("DXF coordinates exceed supported bounds");
      if (Math.hypot(x2 - x, y2 - y) < 1e-7) return;
      floor.walls.push({
        id: uid(),
        a: { x: values[0], y: -values[1] },
        b: { x: values[2], y: -values[3] },
        thickness: 0.14,
        height: 2.8,
        color: "#26364c",
      });
    };
    if (type === "LINE") add(val(10), val(20), val(11), val(21));
    else if (type === "LWPOLYLINE") {
      if (data.some((v) => v.code === 42 && Number(v.value) !== 0))
        throw new Error("Curved/bulged DXF polylines are unsupported");
      const xs = data.filter((v) => v.code === 10).map((v) => Number(v.value)),
        ys = data.filter((v) => v.code === 20).map((v) => Number(v.value));
      if (xs.length !== ys.length) throw new Error("Malformed DXF polyline");
      for (let k = 0; k < xs.length - 1; k++)
        add(xs[k], ys[k], xs[k + 1], ys[k + 1]);
      if (val(70) & 1) add(xs[xs.length - 1], ys[ys.length - 1], xs[0], ys[0]);
    } else unsupported.add(type);
    i = j - 1;
  }
  if (!floor.walls.length)
    throw new Error(
      `No supported DXF geometry found. Unsupported: ${[...unsupported].join(", ") || "none"}`,
    );
  return { scene, unsupported: [...unsupported] };
}
