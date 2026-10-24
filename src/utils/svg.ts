export function downloadSvg(svg: SVGSVGElement, fileName: string): void {
    const source = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(new Blob([source], { type: "image/svg+xml" }));
    const link = document.createElement("a");

    link.href = url;
    link.download = `${fileName.trim().replace(/\s+/g, "-").toLowerCase()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
}

/** A page with only the drawing, on an A4 sheet turned sideways, to print or save as PDF. */
export function printableDocument(svgSource: string, title: string): string {
    const safeTitle = title.replace(/[&<>]/g, "");

    return (
        `<!doctype html><html lang="es"><head><meta charset="UTF-8"><title>${safeTitle}</title>` +
        "<style>@page{size:A4 landscape;margin:12mm}html,body{height:100%;margin:0}" +
        "body{display:flex;align-items:center;justify-content:center}" +
        "svg{width:100%;height:100%;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
        `</style></head><body>${svgSource}</body></html>`
    );
}

/**
 * Opens the browser's print dialog with the drawing alone; choosing «Save as PDF» as the printer
 * gives the PDF. No library: the browser makes the file. The drawing carries its own colours, so
 * it prints as it is seen.
 */
export function printSvg(svg: SVGSVGElement, title: string): void {
    const frame = document.createElement("iframe");

    frame.style.position = "fixed";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    frame.srcdoc = printableDocument(new XMLSerializer().serializeToString(svg), title);
    frame.onload = () => {
        const target = frame.contentWindow;

        if (target === null) {
            frame.remove();
            return;
        }

        target.onafterprint = () => frame.remove();
        target.focus();
        target.print();
    };
    document.body.append(frame);
}
