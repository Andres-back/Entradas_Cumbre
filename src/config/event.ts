export const EVENT_CONFIG = {
  name: "Cumbre Impacto Putumayo 2026",
  shortName: "Cumbre Impacto",
  slogan: "Sembrando y cosechando juntos",
  biblicalReference: "Marcos 4:26-29",

  startDate: "2026-07-10",
  endDate: "2026-07-11",
  displayDate: "10 y 11 de julio de 2026",

  venue: "Iglesia Fuente de Agua Viva Cruzada Cristiana",
  address: "Carrera 11A #15-44, Barrio San Francisco",
  addressLine1: "Carrera 11A #15-44",
  addressLine2: "Barrio San Francisco",
  city: "Mocoa",

  socialHandle: "@PICLATINOAMERICA",
  socialUrl: process.env.SOCIAL_URL ?? "",

  registrationEnabled: process.env.REGISTRATION_ENABLED !== "false",

  registrationContribution: Number(process.env.EVENT_PRICE_COP ?? 45000),
  registrationContributionCurrency: "COP",
  registrationContributionDisplay: "$45.000 COP",

  registrationIncludes: ["Materiales", "Alimentación"],

  capacity: process.env.EVENT_CAPACITY
    ? Number(process.env.EVENT_CAPACITY)
    : null,

  mapsUrl: process.env.MAPS_URL ?? "",
  whatsappUrl: process.env.WHATSAPP_URL ?? "",

  paymentEnabled: process.env.PAYMENT_ENABLED === "true",
  paymentInstructions: process.env.PAYMENT_INSTRUCTIONS ?? "",

  wallpaper: "/cumbre-impacto/cumbre-impacto-wallpaper.webp",
  poster: "/cumbre-impacto/afiche-original.png",
} as const;

export const EVENT_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: EVENT_CONFIG.name,
  startDate: EVENT_CONFIG.startDate,
  endDate: EVENT_CONFIG.endDate,
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  eventStatus: "https://schema.org/EventScheduled",
  location: {
    "@type": "Place",
    name: EVENT_CONFIG.venue,
    address: {
      "@type": "PostalAddress",
      streetAddress: EVENT_CONFIG.address,
      addressLocality: "Mocoa",
      addressRegion: "Putumayo",
      addressCountry: "CO",
    },
  },
  image: [EVENT_CONFIG.wallpaper],
  description:
    "Cumbre Impacto Putumayo 2026. Sembrando y cosechando juntos. 10 y 11 de julio de 2026 en Mocoa.",
};


