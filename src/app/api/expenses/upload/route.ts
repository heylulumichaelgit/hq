import { createClient } from "@/lib/supabase/server";
import { clearDropboxTokenCache, getDropboxToken } from "@/lib/dropbox";
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
  const expenseType = (formData.get("expense_type") as string) || "personal";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const now = new Date();
  const year = now.getFullYear().toString();
  const monthNum = String(now.getMonth() + 1).padStart(2, "0");
  const monthName = now.toLocaleString("en-GB", { month: "long" });
  const monthFolder = `${monthNum}-${monthName}`; // e.g. "03-March"

  // Separate folders for personal vs company
  const typeFolder = expenseType === "company" ? "Company" : "Personal";

  // Sanitize filename
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const filename = `${timestamp}-${safeName}`;

  const fileBuffer = await file.arrayBuffer();

  // --- 1. Upload to Supabase Storage ---
  const storagePath = `${expenseType}/${year}/${monthNum}/receipts/${filename}`;
  let storageUrl: string | null = null;

  const { error: storageError } = await supabase.storage
    .from("receipts")
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (storageError) {
    console.error("Supabase Storage upload error:", storageError.message);
    // Non-fatal — continue to Dropbox
  } else {
    const { data: publicUrlData } = supabase.storage
      .from("receipts")
      .getPublicUrl(storagePath);
    storageUrl = publicUrlData.publicUrl;
  }

  // --- 2. Attempt Dropbox upload ---
  const DROPBOX_FOLDER_PATH = process.env.DROPBOX_FOLDER_PATH ?? "";

  let dropboxPath: string | null = null;
  let dropboxUrl: string | null = null;

  let accessToken = await getDropboxToken();

  if (accessToken) {
    const dbxPath = `${DROPBOX_FOLDER_PATH}/${typeFolder}/${year}/${monthFolder}/Receipts/${filename}`;

    const attemptDropboxUpload = async (token: string) => {
      const uploadRes = await fetch(
        "https://content.dropboxapi.com/2/files/upload",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Dropbox-API-Arg": JSON.stringify({
              path: dbxPath,
              mode: "add",
              autorename: true,
            }),
            "Content-Type": "application/octet-stream",
          },
          body: fileBuffer,
        }
      );
      return uploadRes;
    };

    try {
      let uploadRes = await attemptDropboxUpload(accessToken);

      // On 401, try refreshing the token once and retry
      if (uploadRes.status === 401) {
        console.warn("Dropbox upload got 401, attempting token refresh...");
        clearDropboxTokenCache();
        const newToken = await getDropboxToken();
        if (newToken && newToken !== accessToken) {
          accessToken = newToken;
          uploadRes = await attemptDropboxUpload(accessToken);
        }
      }

      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        dropboxPath = uploadData.path_display ?? dbxPath;

        // Create a shareable link
        const linkRes = await fetch(
          "https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              path: dropboxPath,
              settings: {
                requested_visibility: "public",
                audience: "public",
                access: "viewer",
              },
            }),
          }
        );

        if (linkRes.ok) {
          const linkData = await linkRes.json();
          dropboxUrl = linkData.url ?? null;
          if (dropboxUrl) {
            dropboxUrl = dropboxUrl.replace("?dl=0", "?raw=1");
          }
        } else {
          // Link may already exist — try to get existing links
          const existingRes = await fetch(
            "https://api.dropboxapi.com/2/sharing/list_shared_links",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                path: dropboxPath,
                direct_only: true,
              }),
            }
          );
          if (existingRes.ok) {
            const existingData = await existingRes.json();
            const existing = existingData.links?.[0]?.url ?? null;
            if (existing) {
              dropboxUrl = existing.replace("?dl=0", "?raw=1");
            }
          }
        }
      } else {
        const errText = await uploadRes.text();
        console.error("Dropbox upload error:", errText);
      }
    } catch (err) {
      console.error("Dropbox upload exception:", err);
    }
  }

  // If neither storage succeeded, return an error
  if (!storageUrl && !dropboxPath) {
    return NextResponse.json(
      { error: "All uploads failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    storage_url: storageUrl,
    storage_path: storageError ? null : storagePath,
    dropbox_path: dropboxPath,
    dropbox_url: dropboxUrl,
  });
}

export async function GET() {
  // Health check — tells the client whether Dropbox is configured
  const hasRefreshFlow =
    !!process.env.DROPBOX_REFRESH_TOKEN &&
    !!process.env.DROPBOX_APP_KEY &&
    !!process.env.DROPBOX_APP_SECRET;
  const configured = hasRefreshFlow || !!process.env.DROPBOX_ACCESS_TOKEN;
  return NextResponse.json({ configured });
}
