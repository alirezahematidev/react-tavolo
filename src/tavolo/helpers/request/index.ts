import { useSignal, useSignalEffect } from "@preact/signals-react";
import { Datasource } from "../../types/table.types";
import { useState } from "react";

export const useRequest = <T extends Datasource>(request: (signal: AbortSignal) => Promise<T[]>) => {
  const data = useSignal<T[]>([]);
  const isLoading = useSignal<boolean>(false);
  const error = useSignal<unknown>(undefined);

  const [controller] = useState<AbortController>(new AbortController());

  useSignalEffect(() => {
    isLoading.value = true;

    request(controller.signal)
      .then((response) => {
        data.value = response;
      })
      .catch((reason) => {
        error.value = reason;

        controller.abort(reason);
      })
      .finally(() => {
        isLoading.value = false;
      });

    return () => {
      controller.abort();
    };
  });

  return {
    data: data.value,
    isLoading: isLoading.value,
    error: error.value,
  };
};
