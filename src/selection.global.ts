import { signal } from "@preact/signals-react";

const selectedRows$ = signal<any[]>([]);

export { selectedRows$ };
