/**
 * Shows the eID brand marks below the agreement form so the student
 * recognises which identification methods Dokobit will offer them.
 *
 * Logo placement follows SK ID Solutions branding requirements (Smart-ID
 * and Mobile-ID): official SVGs, untransformed, clearspace preserved.
 * Sources:
 *   - https://www.smart-id.com/e-service-providers/smart-id-branding/
 *   - https://www.mobile-id.lt/en/logos-and-branding/
 * The raw branding kits live at `public/images/{Smart,Mobile}_ID_Branding/`
 * (untracked archives from SK ID); we ship the chosen wordmarks under
 * `public/images/eid/` for clean URLs.
 *
 * Plain <img> intentional — next/image would route these through the
 * image optimizer and SVGs require `dangerouslyAllowSVG`, which we don't
 * want enabled globally for two static brand marks.
 *
 * eParaksts Mobile (Latvia's national eID) is mentioned in text only —
 * VRAA's brand pack isn't bundled here; treat as a TODO if Dokobit's
 * reviewer requests the official logo.
 */
export function SupportedEidMethods() {
  return (
    <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <p className="mb-3 text-center text-xs tracking-wide text-zinc-500 uppercase">
        Supported identification methods
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/eid/smart-id.svg"
          alt="Smart-ID"
          className="h-8 w-auto"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/eid/mobile-id.svg"
          alt="Mobile-ID"
          className="h-8 w-auto"
        />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
          eParaksts Mobile
        </span>
      </div>
      <p className="mt-3 text-center text-xs text-zinc-500">
        You&apos;ll be redirected to Dokobit to pick a method and confirm your
        identity.
      </p>
    </div>
  );
}
