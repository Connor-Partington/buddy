export function chooseFamilyActivity(previous: string, roll: number, timing: number): { state: string; duration: number } {
  const states = ['idle', 'idle', 'lookLeft', 'lookRight', 'thinking', 'walk', 'happy', 'jump', 'sleeping'];
  let state = states[Math.min(states.length - 1, Math.max(0, Math.floor(roll * states.length)))];
  if (state === 'sleeping' && previous === 'sleeping') state = 'idle';
  const duration = state === 'sleeping' ? 18000 + timing * 24000
    : state === 'happy' || state === 'jump' ? 1200 + timing * 1400 : 4000 + timing * 8000;
  return { state, duration };
}

/** Reserve full animation footprints, and use another row when the floor is crowded. */
export function arrangeFamily(width: number, mainCenter: number, mainWidth: number, rowHeight: number, memberWidths: number[]): { x: number; bottom: number }[] {
  const padding = 6, gap = 8;
  const right = Math.max(padding, width - padding);
  const leftEnd = Math.max(padding, Math.min(right, mainCenter - mainWidth / 2 - gap));
  const rightStart = Math.max(padding, Math.min(right, mainCenter + mainWidth / 2 + gap));
  const lanes = [{ start: padding, end: leftEnd, row: 0 }, { start: rightStart, end: right, row: 0 }];
  let laneIndex = 0, cursor = padding;
  return memberWidths.map((requestedWidth) => {
    const size = Math.min(requestedWidth, Math.max(1, width - padding * 2));
    while (cursor + size > lanes[laneIndex].end) {
      laneIndex++;
      if (!lanes[laneIndex]) lanes.push({ start: padding, end: right, row: lanes[laneIndex - 1].row + 1 });
      cursor = lanes[laneIndex].start;
      if (width < padding * 2 + 1) break;
    }
    const position = { x: cursor + size / 2, bottom: 8 + lanes[laneIndex].row * rowHeight };
    cursor += size + gap;
    return position;
  });
}

/** Move a pair together only inside their unoccupied lane; never cross other sleepers. */
export function socialOffset(positions: { x: number; bottom: number }[], widths: number[], pair: number[], panelWidth: number, mainX: number, mainWidth: number, wave: number): number {
  if (pair.length !== 2 || pair.some(i => !positions[i]) || positions[pair[0]].bottom !== positions[pair[1]].bottom) return 0;
  const row = positions[pair[0]].bottom;
  const left = Math.min(...pair.map(i => positions[i].x - widths[i] / 2));
  const right = Math.max(...pair.map(i => positions[i].x + widths[i] / 2));
  let low = 6 - left, high = panelWidth - 6 - right;
  const obstacles = positions.map((p,i)=>({x:p.x,width:widths[i],row:p.bottom,index:i}));
  if(row===8)obstacles.push({x:mainX,width:mainWidth,row:8,index:-1});
  for(const obstacle of obstacles){
    if(pair.includes(obstacle.index)||obstacle.row!==row)continue;
    const end=obstacle.x+obstacle.width/2, start=obstacle.x-obstacle.width/2;
    if(end<=left)low=Math.max(low,end+8-left);
    else if(start>=right)high=Math.min(high,start-8-right);
    else return 0;
  }
  if(low>high)return 0;
  return Math.max(low,Math.min(high,wave*28));
}
