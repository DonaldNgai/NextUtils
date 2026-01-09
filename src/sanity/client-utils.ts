// Client-safe utilities that don't require server-only code
import createImageUrlBuilder from "@sanity/image-url";

// Inline the API config to avoid importing from ./api which might have server-only dependencies
function assertValue<T>(v: T | undefined, errorMessage: string): T {
  if (v === undefined) {
    throw new Error(errorMessage);
  }
  return v;
}

const dataset = assertValue(
  process.env.NEXT_PUBLIC_SANITY_DATASET,
  "Missing environment variable: NEXT_PUBLIC_SANITY_DATASET",
);

const projectId = assertValue(
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  "Missing environment variable: NEXT_PUBLIC_SANITY_PROJECT_ID",
);

/* eslint-disable */
const imageBuilder = createImageUrlBuilder({
  projectId: projectId || "",
  dataset: dataset || "",
});

export const urlForImage = (source: any) => {
  // Ensure that source image contains a valid reference
  if (!source?.asset?._ref) {
    return undefined;
  }

  return imageBuilder?.image(source).auto("format").fit("max");
};

export function resolveOpenGraphImage(image: any, width = 1200, height = 627) {
  if (!image) return;
  const url = urlForImage(image)?.width(1200).height(627).fit("crop").url();
  if (!url) return;
  return { url, alt: image?.alt as string, width, height };
}

export function resolveHref(
  documentType?: string,
  slug?: string,
): string | undefined {
  switch (documentType) {
    case "post":
      return slug ? `/blog/posts/${slug}` : undefined;
    default:
      console.warn("Invalid document type:", documentType);
      return undefined;
  }
}
