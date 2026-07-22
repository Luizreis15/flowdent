import { useEffect, useState, type ImgHTMLAttributes, type ReactNode } from "react";
import { getSignedFileUrl, resolveClinicLogoUrl } from "@/lib/storage";

type SignedFileImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  path: string;
  fallback?: ReactNode;
};

/** <img> que resolve path do storage via signed URL. */
export function SignedFileImage({ path, fallback = null, alt, ...rest }: SignedFileImageProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setFailed(false);
    getSignedFileUrl(path)
      .then((signed) => {
        if (!cancelled) setUrl(signed);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (failed || (!url && fallback)) return <>{fallback}</>;
  if (!url) return <div className={rest.className} aria-hidden />;
  return <img src={url} alt={alt ?? ""} {...rest} />;
}

type SignedClinicLogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | null | undefined;
  fallback?: ReactNode;
};

/** Logo da clínica a partir de path ou URL pública legada. */
export function SignedClinicLogo({ src, fallback = null, alt, ...rest }: SignedClinicLogoProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    if (!src) return;
    resolveClinicLogoUrl(src).then((signed) => {
      if (!cancelled) setUrl(signed ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!src || !url) return <>{fallback}</>;
  return <img src={url} alt={alt ?? "Logo"} {...rest} />;
}
