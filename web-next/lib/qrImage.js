// Renders a QRIS payload string as a scannable QR code image. QRIS strings are
// meant to be publicly scannable (that's the whole point of the format), so
// there's no sensitivity concern in sending it to a public QR-rendering API.
export function qrImageUrl(data, size = 260) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`
}
