import localFont from "next/font/local";

export const antennacond = localFont({
  src: [
    { path: "../fonts/antennacond-light.otf", weight: "300", style: "normal" },
    { path: "../fonts/antennacond-regular.otf", weight: "400", style: "normal" },
    { path: "../fonts/antennacond-medium.otf", weight: "600", style: "normal" },
    { path: "../fonts/antennacond-bold.otf", weight: "700", style: "normal" },
    { path: "../fonts/antennacond-black.otf", weight: "900", style: "normal" },
  ],
  variable: "--font-antennacond",
  display: "swap",
});

export const humming = localFont({
  src: [{ path: "../fonts/humming.otf", weight: "400", style: "normal" }],
  variable: "--font-humming",
  display: "swap",
});
