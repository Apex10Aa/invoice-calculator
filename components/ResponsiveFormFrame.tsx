import type { ReactNode } from "react";

type ResponsiveFormFrameProps = {
  children: ReactNode;
};

/** Single form mount: full-width sheet on small screens, device chrome from lg up. */
export function ResponsiveFormFrame({ children }: ResponsiveFormFrameProps) {
  return (
    <div className="mx-auto w-full lg:max-w-[390px]">
      {/* <div className="mb-4 hidden lg:block">
        <p className="text-[10px] tracking-[0.45em] text-[#8a7d6e] uppercase">
          Owner device
        </p>
        <p className="mt-1 text-[13px] text-[#6f655c]">
          Scroll the phone — preview stays pinned on the right.
        </p>
      </div> */}

      <div className="relative lg:phone-bezel lg:rounded-[2.75rem] lg:p-[10px] lg:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.85)]">
        <div
          className="pointer-events-none absolute left-1/2 top-[18px] z-20 hidden h-[22px] w-[96px] -translate-x-1/2 rounded-full bg-black/90 lg:block"
          aria-hidden
        />
        <div className="phone-screen relative flex max-h-none flex-col overflow-hidden rounded-[1.35rem] bg-[#f8f3eb] shadow-[0_20px_50px_-24px_rgba(0,0,0,0.45)] lg:max-h-[min(82vh,780px)] lg:min-h-[520px] lg:rounded-[2.15rem] lg:shadow-none">
          <div className="hidden shrink-0 items-center justify-between border-b border-[#e8dcc8] px-5 pb-3 pt-10 lg:flex">
            <span className="text-[10px] font-medium tracking-[0.35em] text-[#9a7043] uppercase">
              GEM Collections
            </span>
            <span className="text-[10px] text-[#b5a896]">9:41</span>
          </div>
          <div className="form-scroll gem-form flex-1 px-5 py-6 lg:overflow-y-auto lg:overscroll-contain lg:px-5 lg:pb-8 lg:pt-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
