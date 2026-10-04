export function downloadSvg(svg: SVGSVGElement, fileName: string): void {
    const source = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(new Blob([source], { type: "image/svg+xml" }));
    const link = document.createElement("a");

    link.href = url;
    link.download = `${fileName.trim().replace(/\s+/g, "-").toLowerCase()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
}
