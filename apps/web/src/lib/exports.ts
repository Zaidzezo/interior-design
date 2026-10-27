import { Scene, Floor, SceneSchema } from "@core/model";
import { planSvg, svgData } from "@core/vector";
import { estimate } from "@core/estimate";
export function download(content: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportPlan(
  type: string,
  scene: Scene,
  floor: Floor,
  options = { grid: false, labels: true, measurements: true },
) {
  const name = scene.name.replace(/[^\w-]/g, "_");
  if (type === "json") {
    download(
      JSON.stringify(scene, null, 2),
      `${name}.buildspace.json`,
      "application/json",
    );
    return;
  }
  if (type === "csv") {
    const rows = estimate(scene);
    const q = (s: unknown) => `"${String(s).replace(/"/g, '""')}"`;
    download(
      [
        [
          "Category",
          "Name",
          "Floor",
          "Quantity",
          "Unit",
          "Demo unit price",
          "Total",
        ],
        ...rows.map((r) => [
          r.category,
          r.name,
          r.floor,
          r.quantity.toFixed(3),
          r.unit,
          r.rate,
          r.total.toFixed(2),
        ]),
      ]
        .map((r) => r.map(q).join(","))
        .join("\r\n"),
      `${name}-estimate.csv`,
      "text/csv",
    );
    return;
  }
  if (type === "svg") {
    download(planSvg(floor, options), `${name}.svg`, "image/svg+xml");
    return;
  }
  const svg = planSvg(floor, options);
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Could not rasterize floor plan"));
    image.src = svgData(svg);
  });
  const canvas = document.createElement("canvas");
  canvas.width = image.width * 2;
  canvas.height = image.height * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  if (type === "png") {
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) =>
        b ? resolve(b) : reject(new Error("PNG encoding failed")),
      ),
    );
    download(blob, `${name}.png`, "image/png");
    return;
  }
  if (type === "pdf") {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? "landscape" : "portrait",
      unit: "mm",
      format: "a3",
    });
    const pageW = pdf.internal.pageSize.getWidth(),
      pageH = pdf.internal.pageSize.getHeight();
    pdf.setFontSize(16);
    pdf.text(scene.name, 15, 17);
    pdf.setFontSize(9);
    pdf.text(
      `${floor.name} · BuildSpace · ${new Date().toLocaleDateString()} · Scale to fit`,
      15,
      24,
    );
    const scale = Math.min(
      (pageW - 30) / canvas.width,
      (pageH - 55) / canvas.height,
    );
    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      (pageW - canvas.width * scale) / 2,
      32,
      canvas.width * scale,
      canvas.height * scale,
    );
    pdf.text(
      "Concept plan — dimensions must be independently verified. Demo prices are not market quotations.",
      15,
      pageH - 12,
    );
    pdf.save(`${name}.pdf`);
  }
}
export async function importScene(file: File) {
  if (file.size > 5_000_000) throw new Error("Scene files must be under 5 MB");
  return SceneSchema.parse(JSON.parse(await file.text()));
}
export async function imageReference(file: File) {
  if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 2_500_000)
    throw new Error("Use a PNG or JPEG under 2.5 MB");
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Image could not be read"));
    reader.readAsDataURL(file);
  });
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Invalid image"));
    image.src = dataUrl;
  });
  if (image.width * image.height > 40_000_000)
    throw new Error("Image exceeds 40 megapixels");
  return {
    id: crypto.randomUUID(),
    name: file.name.slice(0, 100),
    dataUrl,
    x: 0,
    y: 0,
    width: 10,
    depth: (10 * image.height) / image.width,
    opacity: 0.35,
    locked: true,
  };
}
export async function exportEstimatePdf(scene: Scene) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  let y = 20;
  const money = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: scene.currency,
    }).format(n);
  pdf.setFontSize(19);
  pdf.text(scene.name, 15, y);
  y += 10;
  pdf.setFontSize(10);
  pdf.text("BuildSpace | Bill of materials | Catalog demo prices", 15, y);
  y += 10;
  pdf.setFontSize(9);
  for (const line of estimate(scene)) {
    if (y > 270) {
      pdf.addPage();
      y = 20;
    }
    pdf.text(`${line.name}`.slice(0, 62), 15, y);
    pdf.text(`${line.quantity.toFixed(2)} ${line.unit}`, 139, y, {
      align: "right",
    });
    pdf.text(money(line.total), 195, y, { align: "right" });
    y += 7;
  }
  if (y > 260) {
    pdf.addPage();
    y = 20;
  }
  y += 6;
  pdf.setFontSize(12);
  pdf.text("Estimated total", 15, y);
  pdf.text(
    money(estimate(scene).reduce((sum, line) => sum + line.total, 0)),
    195,
    y,
    { align: "right" },
  );
  pdf.setFontSize(8);
  pdf.text(
    "Illustrative prices. Excludes taxes, labor, and delivery. Verify quantities before purchasing.",
    15,
    y + 12,
  );
  pdf.save("buildspace-estimate.pdf");
}
