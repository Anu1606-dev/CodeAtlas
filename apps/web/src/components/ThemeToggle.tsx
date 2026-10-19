import { Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ opacity: 0, rotate: -90 }}
          animate={{ opacity: 1, rotate: 0 }}
          exit={{ opacity: 0, rotate: 90 }}
          transition={{ duration: 0.15 }}
          className="flex"
        >
          {theme === "codeatlas-dark" ? <Sun size={18} /> : <Moon size={18} />}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}