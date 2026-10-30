import { createClientOnlyFn } from "@tanstack/react-start";

export const downloadText = createClientOnlyFn(
  (filename: string, content: string, type: string) => {
    const href = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    // Keep the object URL alive through the browser's download event.
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
  },
);
