import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const DROPBOX_ACCESS_TOKEN = process.env.DROPBOX_ACCESS_TOKEN;
  const DROPBOX_FOLDER_PATH = process.env.DROPBOX_FOLDER_PATH || "/HQ Expenses";

  // If Dropbox is not configured, return a mock response
  if (!DROPBOX_ACCESS_TOKEN) {
    return NextResponse.json({
      path: `${DROPBOX_FOLDER_PATH}/mock/${file.name}`,
      url: null,
      mock: true,
    });
  }

  const now = new Date();
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  // Sanitize filename
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const filename = `${timestamp}_${safeName}`;
  const dropboxPath = `${DROPBOX_FOLDER_PATH}/${year}/${month}/${filename}`;

  try {
    // Upload file to Dropbox
    const fileBuffer = await file.arrayBuffer();

    const uploadRes = await fetch(
      "https://content.dropboxapi.com/2/files/upload",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DROPBOX_ACCESS_TOKEN}`,
          "Dropbox-API-Arg": JSON.stringify({
            path: dropboxPath,
            mode: "add",
            autorename: true,
          }),
          "Content-Type": "application/octet-stream",
        },
        body: fileBuffer,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error("Dropbox upload error:", errText);
      return NextResponse.json(
        { error: "Dropbox upload failed", detail: errText },
        { status: 500 }
      );
    }

    const uploadData = await uploadRes.json();
    const actualPath: string = uploadData.path_display ?? dropboxPath;

    // Create a shareable link
    const linkRes = await fetch(
      "https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DROPBOX_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: actualPath,
          settings: {
            requested_visibility: "public",
            audience: "public",
            access: "viewer",
          },
        }),
      }
    );

    let shareUrl: string | null = null;

    if (linkRes.ok) {
      const linkData = await linkRes.json();
      shareUrl = linkData.url ?? null;
      // Convert dl=0 to raw=1 for direct image preview
      if (shareUrl) {
        shareUrl = shareUrl.replace("?dl=0", "?raw=1");
      }
    } else {
      // Link may already exist — try to get existing links
      const existingRes = await fetch(
        "https://api.dropboxapi.com/2/sharing/list_shared_links",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${DROPBOX_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ path: actualPath, direct_only: true }),
        }
      );
      if (existingRes.ok) {
        const existingData = await existingRes.json();
        const existing = existingData.links?.[0]?.url ?? null;
        if (existing) {
          shareUrl = existing.replace("?dl=0", "?raw=1");
        }
      }
    }

    return NextResponse.json({ path: actualPath, url: shareUrl });
  } catch (err) {
    console.error("Dropbox upload exception:", err);
    return NextResponse.json(
      { error: "Upload failed", detail: String(err) },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Health check — tells the client whether Dropbox is configured
  const configured = !!process.env.DROPBOX_ACCESS_TOKEN;
  return NextResponse.json({ configured });
}
