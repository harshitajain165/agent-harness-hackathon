"use client";

import * as React from "react";

function isAriaInvalid(node: Element): boolean {
  const value = node.getAttribute("aria-invalid");
  return value === "true" || value === "";
}

function shake(target: HTMLElement) {
  target.removeAttribute("data-shaking");
  void target.offsetWidth;
  target.setAttribute("data-shaking", "");
}

/**
 * Plays the invalid shake once when a control becomes invalid.
 * Skips the mount frame so static `aria-invalid` examples do not animate on load.
 */
export function useInvalidShake(mode: "self" | "input-group" = "self") {
  const [node, setNode] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!node) return;

    const targetFor = () => {
      if (mode !== "input-group") return node;
      const group = node.closest("[data-slot=input-group]");
      return group instanceof HTMLElement ? group : node;
    };

    let wasInvalid = isAriaInvalid(node);

    const observer = new MutationObserver(() => {
      const nowInvalid = isAriaInvalid(node);
      if (nowInvalid && !wasInvalid) {
        shake(targetFor());
      }
      wasInvalid = nowInvalid;
    });

    observer.observe(node, {
      attributes: true,
      attributeFilter: ["aria-invalid"],
    });

    const onInvalid = () => {
      shake(targetFor());
      wasInvalid = true;
    };
    node.addEventListener("invalid", onInvalid);

    return () => {
      observer.disconnect();
      node.removeEventListener("invalid", onInvalid);
    };
  }, [mode, node]);

  return React.useCallback((value: HTMLElement | null) => {
    setNode(value);
  }, []);
}

export function mergeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> {
  return (value) => {
    for (const ref of refs) {
      if (typeof ref === "function") {
        ref(value);
      } else if (ref) {
        ref.current = value;
      }
    }
  };
}
