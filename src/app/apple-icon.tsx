import { getProfile } from "@/lib/content";
import { monogram } from "@/lib/og/monogram";
import { initials } from "@/lib/og/initials";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return monogram(initials(getProfile().name), size.width);
}
