import { useSignal } from "@preact/signals-react";
import React, { Fragment, RefObject, startTransition, useEffect } from "react";

interface LazyRenderProps {
  children: React.ReactNode;
  lazy?: boolean;
  lazyRef: RefObject<HTMLElement>;
}

export const LazyRender = ({ children, lazyRef, lazy }: LazyRenderProps) => {
  const inView = useSignal<boolean>(false);

  useEffect(() => {
    if (!lazyRef.current || !lazy) return;

    const element = lazyRef.current;

    const observer = new IntersectionObserver(([entry]) => {
      startTransition(() => {
        inView.value = entry.isIntersecting;
      });
    });

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [inView, lazy, lazyRef]);

  if (!lazy) return <Fragment>{children}</Fragment>;

  return <Fragment>{inView.value ? children : null}</Fragment>;
};
