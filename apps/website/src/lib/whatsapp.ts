// One place for the Buildhaus WhatsApp number and wa.me links: the
// /whatsapp short link (Instagram bio) and the "Chat on WhatsApp" buttons on
// the enquiry, estimator and quotation pages all build their URL here.

export const WHATSAPP_NUMBER = "917382573826";
export const DEFAULT_WHATSAPP_MESSAGE = "Hi Buildhaus, I'd like a site visit";

export function whatsappUrl(message: string = DEFAULT_WHATSAPP_MESSAGE): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
