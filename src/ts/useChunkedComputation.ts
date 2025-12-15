import { ref } from 'vue';

export function useChunkedComputation() {
   const isComputing = ref(false);
   let abortController: AbortController | null = null;

   async function computeChunked<T, R>(
      items: T[],
      processFn: (item: T, index: number) => R,
      onBatch: (results: Array<{ index: number; result: R }>) => void,
      chunkSize = 100,
      yieldEvery = 50,
      onComplete?: () => void
   ): Promise<void> {
      // Abort any previous computation
      abortController?.abort();
      abortController = new AbortController();
      const signal = abortController.signal;

      isComputing.value = true;

      try {
         const batch: Array<{ index: number; result: R }> = [];

         for (let i = 0; i < items.length; i++) {
            if (signal.aborted) return;

            const result = processFn(items[i]!, i);
            batch.push({ index: i, result });

            // Send batch and yield to event loop periodically
            if (batch.length >= chunkSize) {
               onBatch([...batch]);
               batch.length = 0;
            }

            if (i % yieldEvery === 0) {
               await new Promise((r) => setTimeout(r, 0));
            }
         }

         // Send remaining
         if (batch.length > 0) {
            onBatch(batch);
         }

         onComplete?.();
      } finally {
         if (!signal.aborted) {
            isComputing.value = false;
         }
      }
   }

   function abort() {
      abortController?.abort();
      isComputing.value = false;
   }

   return { computeChunked, abort, isComputing };
}
