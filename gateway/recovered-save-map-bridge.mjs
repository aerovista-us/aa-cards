// Lossless conversion of the fields actually persisted by recovered app.js
// captureMapSnapshot(): {w,h,grid,worldProfile}. Never manufacture absent data.
export function toRecoveredSavedMap(worldMap){
 if(!worldMap||!Number.isSafeInteger(worldMap.width)||!Number.isSafeInteger(worldMap.height)||
   worldMap.width<1||worldMap.height<1||!Array.isArray(worldMap.tiles)||
   worldMap.tiles.length!==worldMap.width*worldMap.height||!worldMap.worldProfile||
   typeof worldMap.worldProfile!=='object') throw new TypeError('Complete canonical map required');
 return structuredClone({w:worldMap.width,h:worldMap.height,grid:worldMap.tiles,worldProfile:worldMap.worldProfile});
}
export function fromRecoveredSavedMap(map){
 if(!map||!Number.isSafeInteger(map.w)||!Number.isSafeInteger(map.h)||
   map.w<1||map.h<1||!Array.isArray(map.grid)||map.grid.length!==map.w*map.h||
   !map.worldProfile||typeof map.worldProfile!=='object') throw new TypeError('Complete recovered saved map required');
 return structuredClone({width:map.w,height:map.h,tiles:map.grid,worldProfile:map.worldProfile});
}
