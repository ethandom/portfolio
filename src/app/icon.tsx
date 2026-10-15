import { getProfile } from "@/lib/content";
import { monogram } from "@/lib/og/monogram";
import { initials } from "@/lib/og/initials";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return monogram(initials(getProfile().name), size.width);
}
