import { signal } from "@preact/signals-react";

const globalSelectedRows = signal<any[]>([]);

export { globalSelectedRows };
