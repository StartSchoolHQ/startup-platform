/**
 * Shows the eID brand marks below the agreement form so the student
 * recognises which identification methods Dokobit will offer them.
 *
 * Logo placement follows brand owner guidelines:
 *   - Smart-ID: official SVG wordmark, untransformed, clearspace preserved.
 *     Source: https://www.smart-id.com/e-service-providers/smart-id-branding/
 *   - eParaksts (eID card + eMobile): VRAA / LVRTC brand assets shipped
 *     under `public/images/eparaksts/`.
 *
 * Mobile-ID is intentionally NOT shown — it's an EE/LT service and
 * StartSchool's flow is LV-only.
 *
 * Plain <img> intentional — next/image would route these through the
 * image optimizer and SVGs require `dangerouslyAllowSVG`, which we don't
 * want enabled globally for static brand marks.
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
          src="/images/eparaksts/eMobile.png"
          alt="eParaksts Mobile"
          className="h-8 w-auto"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/eparaksts/eID.png"
          alt="eParaksts (eID card)"
          className="h-8 w-auto"
        />
      </div>
      <p className="mt-3 text-center text-xs text-zinc-500">
        You&apos;ll be redirected to Dokobit to pick a method and confirm your
        identity.
      </p>
    </div>
  );
}
