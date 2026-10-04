import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const baseUrl = `${url.protocol}//${url.host}`

  const manifest = [
    {
      guid: "b7812903-8821-4d1a-8219-spatialposters01",
      name: "SpatialPosters",
      description: "High-definition dynamic artwork engine & poster provider for Jellyfin.",
      overview: "Fetch dynamic posters, ratings, and localized artwork directly into Jellyfin libraries.",
      owner: "TheAceOfficials",
      category: "Metadata",
      versions: [
        {
          version: "1.0.0.0",
          changelog: "Initial release of SpatialPosters Jellyfin integration plugin.",
          targetAbi: "10.9.0.0",
          sourceUrl: `${baseUrl}/jellyfin/jellyfin-plugin-spatialposters.zip`,
          checksum: "",
          timestamp: new Date().toISOString(),
        },
      ],
    },
  ]

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  })
}
