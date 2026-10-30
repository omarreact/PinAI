export function downloadText(filename: string, content: string, mime: string) {
  if (window.PinAIAndroid) window.PinAIAndroid.exportFile(filename, content, mime.split(";")[0]);
  else window.alert("Saving is available inside the PinAI Android app.");
}
