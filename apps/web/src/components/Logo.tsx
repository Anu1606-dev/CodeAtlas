import { useTheme } from "../context/ThemeContext";
import logoDark from "@/assets/logo-dark.png";
import logoLight from "@/assets/logo-light.png";

export default function Logo({ className }: { className?: string }) {
  const { theme } = useTheme();
  const src = theme === "codeatlas-dark" ? logoDark : logoLight;
  return <img src={src} alt="CodeAtlas" className={className} />;
}