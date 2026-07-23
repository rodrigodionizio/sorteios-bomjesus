import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const fontData = await readFile(
    join(process.cwd(), "src/fonts/antennacond-black.otf"),
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #a41d31 0%, #7c1524 100%)",
          color: "#fceccb",
          fontFamily: "Antennacond",
        }}
      >
        <div style={{ display: "flex", fontSize: 64, marginBottom: 18 }}>
          🎟️
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 30,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "rgba(252,236,203,0.7)",
            marginBottom: 10,
          }}
        >
          Paróquia Senhor Bom Jesus
        </div>
        <div style={{ display: "flex", fontSize: 88, lineHeight: 1 }}>
          Sorteios Bom Jesus
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 30,
            marginTop: 22,
            color: "#fbb558",
          }}
        >
          Placar ao vivo dos vendedores
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Antennacond", data: fontData, style: "normal", weight: 900 },
      ],
    },
  );
}
