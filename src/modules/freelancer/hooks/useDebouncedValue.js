import { useEffect, useState } from "react";

export default function useDebouncedValue(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, Math.max(0, Number(delayMs) || 0));

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
