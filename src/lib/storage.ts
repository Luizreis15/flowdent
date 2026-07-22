import { supabase } from "@/integrations/supabase/client";

export const PATIENT_FILES_BUCKET = "patient-files";

/** Duração padrão das signed URLs (5 min). */
export const DEFAULT_SIGNED_URL_TTL = 60 * 5;

/**
 * Extrai o path do storage a partir de uma URL pública antiga
 * (`.../object/public/patient-files/...`) ou devolve o path se já for relativo.
 */
export function pathFromPublicUrl(pathOrUrl: string): string {
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return trimmed;

  const markers = [
    `/storage/v1/object/public/${PATIENT_FILES_BUCKET}/`,
    `/storage/v1/object/sign/${PATIENT_FILES_BUCKET}/`,
    `/object/public/${PATIENT_FILES_BUCKET}/`,
  ];

  for (const marker of markers) {
    const idx = trimmed.indexOf(marker);
    if (idx !== -1) {
      const path = trimmed.slice(idx + marker.length).split("?")[0];
      return decodeURIComponent(path);
    }
  }

  // Já é path relativo (ex: clinicas/{id}/logo.png)
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return trimmed.split("?")[0];
  }

  return trimmed.split("?")[0];
}

/** Signed URL curta para um path (ou URL pública legada). */
export async function getSignedFileUrl(
  pathOrUrl: string,
  expiresIn: number = DEFAULT_SIGNED_URL_TTL,
): Promise<string> {
  const path = pathFromPublicUrl(pathOrUrl);
  if (!path) throw new Error("Path de arquivo vazio");

  const { data, error } = await supabase.storage
    .from(PATIENT_FILES_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    throw error ?? new Error("Falha ao gerar signed URL");
  }

  return data.signedUrl;
}

/** Resolve logo da clínica (path ou URL pública legada) → signed URL, ou undefined. */
export async function resolveClinicLogoUrl(
  logotipoUrlOrPath: string | null | undefined,
  expiresIn: number = DEFAULT_SIGNED_URL_TTL,
): Promise<string | undefined> {
  if (!logotipoUrlOrPath) return undefined;
  try {
    return await getSignedFileUrl(logotipoUrlOrPath, expiresIn);
  } catch (err) {
    console.error("[storage] Falha ao assinar logo:", err);
    return undefined;
  }
}

/** Batch de signed URLs (path → url). Falhas individuais são omitidas. */
export async function getSignedFileUrls(
  paths: string[],
  expiresIn: number = DEFAULT_SIGNED_URL_TTL,
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  const results = await Promise.all(
    unique.map(async (path) => {
      try {
        const url = await getSignedFileUrl(path, expiresIn);
        return [path, url] as const;
      } catch {
        return null;
      }
    }),
  );

  const map = new Map<string, string>();
  for (const entry of results) {
    if (entry) map.set(entry[0], entry[1]);
  }
  return map;
}

export async function uploadPatientFile(
  path: string,
  file: File,
  options?: { upsert?: boolean },
) {
  const { error } = await supabase.storage
    .from(PATIENT_FILES_BUCKET)
    .upload(path, file, { upsert: options?.upsert ?? false });
  if (error) throw error;
  return { path };
}

export async function removePatientFiles(paths: string[]) {
  const { error } = await supabase.storage.from(PATIENT_FILES_BUCKET).remove(paths);
  if (error) throw error;
}

export async function downloadPatientFile(path: string): Promise<Blob> {
  const { data, error } = await supabase.storage
    .from(PATIENT_FILES_BUCKET)
    .download(path);
  if (error || !data) throw error ?? new Error("Download falhou");
  return data;
}
