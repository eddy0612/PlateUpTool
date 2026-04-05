<template>
  <section class="left-panel">
    <div style="position:relative; width:100%;">

      <div class="viewport-box">
        <div class="grid" :style="gridStyleDynamic">
          <div
            v-for="cellInfo in flatGrid"
            :key="'cell-' + cellInfo.x + '-' + cellInfo.y"
            class="grid-item"
            @contextmenu.prevent="rotateCell(cellInfo.x, cellInfo.y)"
            @click="selectCell(cellInfo.x, cellInfo.y)"
          >
            <div class="cell-label">{{ cellInfo.y }},{{ cellInfo.x }}</div>
            <template v-if="cellInfo.cell && cellInfo.cell.applianceId">
              <span :style="rotationStyle(cellInfo.cell.rotation)">
                <img
                  v-if="isImageIcon(getApplianceIcon(cellInfo.cell.applianceId))"
                  :src="getApplianceIcon(cellInfo.cell.applianceId)"
                  :alt="cellInfo.cell.applianceId"
                  style="max-width:100%;max-height:100%;display:block;"
                />
                <template v-else>{{ getApplianceIcon(cellInfo.cell.applianceId) }}</template>
              </span>
            </template>
          </div>
        </div>
      </div>

      <div class="tabs">
        <div
          v-for="tab in state.tabs"
          :key="tab.id"
          :class="['tab-postit', { active: state.activeTabId === tab.id }]"
          @click="state.activeTabId = tab.id"
        >
          {{ tab.label }}
        </div>
        <div class="tab-postit add" v-if="state.tabs.length < 15" @click="addTab">+</div>
      </div>

    </div>

    <div class="controls">
      <div class="control-compass">
        <span class="compass" :style="{ transform: 'rotate(' + state.orientation + 'deg)' }">🧭</span>
        <span>{{ state.orientation }}°</span>
      </div>
      <div class="control-mode">
        <label><input type="radio" value="2D" v-model="state.viewMode" /> 2D</label>
        <label><input type="radio" value="3D" v-model="state.viewMode" /> 3D</label>
      </div>
      <div class="control-zoom">
        <label>Zoom {{ (state.zoom * 100).toFixed(0) }}%</label>
        <input type="range" min="0.3" max="1.3" step="0.05" v-model.number="state.zoom" />
      </div>
    </div>
  </section>
</template>

<script>
import { useRestaurantStore } from '../store/restaurant'
import { useGrid } from '../composables/useGrid'

export default {
  name: 'GridView',
  setup() {
    const { state } = useRestaurantStore()
    const { flatGrid, gridStyleDynamic, rotationStyle, getApplianceIcon, isImageIcon, rotateCell, selectCell } = useGrid()

    function addTab() {
      if (state.tabs.length >= 15) return
      const nextId = `tab-${Date.now()}`
      state.tabs.push({ id: nextId, label: `Tab ${state.tabs.length + 1}`, items: [] })
      state.activeTabId = nextId
    }

    return { state, flatGrid, gridStyleDynamic, rotationStyle, getApplianceIcon, isImageIcon, rotateCell, selectCell, addTab }
  }
}
</script>

<style scoped>
.left-panel {
  flex: 1 1 0%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  overflow: visible;
  padding-left: 0;
  height: auto;
}
.viewport-box {
  background: #f7f8fa;
  border: 1px solid #bfc9d8;
  border-radius: 8px;
  padding: 8px;
  position: relative;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
  height: auto;
  min-width: 0;
  min-height: 0;
}
.grid {
  display: grid;
  gap: 2px;
  background: #e8eef8;
  border: 2px solid #b0c7dd;
  position: relative;
  overflow: auto;
  transform-origin: center;
  min-height: 0;
  min-width: 0;
  flex-shrink: 0;
}
.grid::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, transparent 0%, transparent calc(100%/16 - 2px), #c8d6e4 calc(100%/16 - 2px), #c8d6e4 calc(100%/16));
  pointer-events: none;
  z-index: 0;
}
.grid::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 0%, transparent calc(100%/12 - 2px), #c8d6e4 calc(100%/12 - 2px), #c8d6e4 calc(100%/12));
  pointer-events: none;
  z-index: 0;
}
.grid-item {
  z-index: 1;
}
.grid-item {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  border: 1px solid #c8d6e4;
  box-sizing: border-box;
  position: relative;
}
.grid-item.selected { border: 2px solid #1f79ff; background: #dde9ff }
.cell-label { font-size: 10px; color: #bbb; position: absolute; top: 2px; left: 2px; }
.tabs {
  position: absolute;
  bottom: 16px;
  left: -60px;
  width: 160px;
  max-height: calc(100% - 32px);
  overflow: visible;
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  z-index: 100;
  pointer-events: auto;
}
.tab-postit {
  width: 110px;
  min-width: 100px;
  margin-left: 0;
  padding: 8px 12px;
  background: #fff4b2;
  border: 1px solid #e8ce6a;
  border-radius: 4px 4px 6px 6px;
  box-shadow: 2px 2px 6px rgba(0,0,0,0.2);
  cursor: pointer;
  transform-origin: left top;
  transition: transform 0.2s, background 0.2s, border-color 0.2s;
  transform: translateX(-3px) rotate(0deg);
}
.tab-postit.active { margin-left: 10px; z-index: 20; background: #ffe680; border-color: #f0c542; font-weight: 700 }
.tab-postit.add { font-weight: 700; background: #c8e7ff; border-color: #7bbbf3; }
.tab-postit:hover { transform: translateX(-3px) scale(1.02) rotate(0deg) }
.controls { display: flex; gap: 18px; align-items: center; }
.control-compass, .control-mode, .control-zoom { display: flex; align-items: center; gap: 6px }
.compass { display: inline-block; transition: transform 0.2s }
</style>
