<script setup lang="ts">
   import { markRaw, ref, h, defineComponent, toRefs } from 'vue';
   import { AgGridVue } from 'ag-grid-vue3';
   import type { Player, Play } from '../ts/player';
   import type { LightColorTheme } from '../ts/board';
   import { mapsToColors } from '../ts/board';
   import BoardGrid from './BoardGrid.vue';
   import type { GridApi, GridReadyEvent, AutoSizeStrategy } from 'ag-grid-community';

   const props = defineProps<{
      boardLetters: string;
      player: Player | null;
      theme: LightColorTheme;
      searchResults: Play[];
      boardPreviewCellSize: number;
      move: number;
   }>();

   const emit = defineEmits<{
      (e: 'add-to-history', play: Play): void;
   }>();

   const { boardLetters, player, theme, searchResults, boardPreviewCellSize, move } = toRefs(props);
   const autoSizeStrategy: AutoSizeStrategy = { type: 'fitCellContents' };

   const SearchBoardCellRenderer = defineComponent({
      name: 'BoardCellRenderer',
      props: { params: { type: Object, required: true } },
      render() {
         const p = this.params;
         const colors = mapsToColors(p.data.blue_map, p.data.red_map);
         return h(BoardGrid, {
            letters: boardLetters.value,
            colors,
            theme: theme.value,
            size: boardPreviewCellSize.value,
         });
      },
   });

   const FinishCellRenderer = defineComponent({
      name: 'FinishCellRenderer',
      props: { params: { type: Object, required: true } },
      render() {
         // computeFinish returns a small HTML snippet; we set it as innerHTML.
         return h('span', { innerHTML: computeFinish(this.params.data as Play) });
      },
   });

   const AddToHistoryCellRenderer = defineComponent({
      name: 'AddToHistoryCellRenderer',
      props: { params: { type: Object, required: true } },
      render() {
         const p = this.params;
         return h(
            'button',
            {
               type: 'button',
               title: 'Add to history',
               onClick: () => {
                  // Prefer a callback passed via cellRendererParams; fallback to component emit
                  if (p?.onAdd) {
                     p.onAdd(p.data as Play);
                  } else {
                     emit('add-to-history', p.data as Play);
                  }
               },
            },
            'Play'
         );
      },
   });

   const searchColDefs = ref([
      {
         headerName: 'Word',
         field: 'word',
         filter: 'agTextColumnFilter',
         filterParams: {
            filterOptions: ['contains'],
            textFormatter: (text: string | null | undefined) =>
               typeof text === 'string' ? text.toUpperCase() : text,
         },
      },
      { headerName: 'Score', field: 'score' },
      { headerName: 'Board', cellRenderer: markRaw(SearchBoardCellRenderer) },
      { headerName: 'Finish', colId: 'finish', cellRenderer: markRaw(FinishCellRenderer) },
      {
         headerName: 'Action',
         colId: 'actions',
         cellRenderer: markRaw(AddToHistoryCellRenderer),
         cellRendererParams: {
            onAdd: (play: Play) => emit('add-to-history', play),
         },
      },
   ]);

   /**
    * Returns the value of the Finish column for a play
    * @param play - the play to evaluate
    */
   function computeFinish(play: Play): string {
      if ((play.score > 999 && move.value == 1) || (play.score < -999 && move.value == -1)) {
         return '<span title="Winning play">🏆</span>';
      } else {
         if (play.ending_soon === true) {
            if (play.losing) {
               return '<span title="Opponent can win next move.">⚠️</span>';
            } else {
               return '<span title="Ending soon, but opponent doesn\'t have a win.">🏁</span>';
            }
         } else if (play.ending_soon === undefined) {
            return '';
         } else {
            return '<span title="Game can\'t end next move.">-</span>';
         }
      }
   }

   let gridApi: GridApi | undefined;

   function computeEndgameForCurrentPage() {
      if (!gridApi || !player.value) return;
      const pageSize = gridApi.paginationGetPageSize();
      const currentPage = gridApi.paginationGetCurrentPage();
      const start = currentPage * pageSize;
      const end = Math.min(start + pageSize, gridApi.getDisplayedRowCount());
      for (let i = start; i < end; i++) {
         const rowNode = gridApi.getDisplayedRowAtIndex(i);
         if (!rowNode) continue;
         const play = rowNode.data as Play;
         const [ending_soon, losing] = player.value.endgameCheck(
            boardLetters.value,
            play.blue_map,
            play.red_map,
            1
         );
         play.ending_soon = ending_soon;
         play.losing = losing;
      }
      gridApi.refreshCells({ columns: ['finish'] });
   }

   function onSearchGridReady(params: GridReadyEvent) {
      gridApi = params.api;
      computeEndgameForCurrentPage();
   }

   function onSearchPaginationChanged() {
      computeEndgameForCurrentPage();
   }

   defineExpose({
      computeEndgameForCurrentPage,
   });
</script>

<template>
   <div class="results-grid">
      <ag-grid-vue
         :rowData="searchResults"
         :columnDefs="searchColDefs"
         :autoSizeStrategy="autoSizeStrategy"
         style="height: 100%"
         :pagination="true"
         :paginationPageSize="20"
         :rowHeight="boardPreviewCellSize * 5 + 4"
         @grid-ready="onSearchGridReady"
         @pagination-changed="onSearchPaginationChanged"
      ></ag-grid-vue>
   </div>
</template>

<style>
   .results-grid {
      flex: 1 1 auto;
      min-height: 0;
   }

   @media (max-width: 900px) {
      .results-grid {
         flex: 0 0 auto;
         height: 420px;
      }
   }
</style>
