// script.js – Dijkstra with Waypoints and Visual Debug (Optimized Visualization)

const rows = 20;
const cols = 20;
const grid = [];
let startCell = null;
let endCell = null;
let waypoints = [];
let isMouseDown = false;
let isDragModeWall = true;
let isCancelled = false;

const MAX_WAYPOINTS = 5;

function createGrid() {
  const container = document.getElementById("grid-container");
  const wallModeCheckbox = document.getElementById("wallToggle");

  container.innerHTML = "";
  grid.length = 0;
  waypoints = [];
  startCell = null;
  endCell = null;

  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) {
      const cellDiv = document.createElement("div");
      cellDiv.className = "cell";
      cellDiv.dataset.x = x;
      cellDiv.dataset.y = y;

      const cellObj = { x, y, cell: cellDiv, isWall: false };
      row.push(cellObj);
      container.appendChild(cellDiv);

      cellDiv.addEventListener("mousedown", () => {
        if (wallModeCheckbox.checked) {
          if (cellObj !== startCell && cellObj !== endCell && !waypoints.includes(cellObj)) {
            isMouseDown = true;
            isDragModeWall = !cellObj.isWall;
            cellObj.isWall = isDragModeWall;
            cellDiv.classList.toggle("wall", isDragModeWall);
          }
        } else {
          onCellClick(cellDiv);
        }
      });

      cellDiv.addEventListener("mouseenter", () => {
        if (isMouseDown && wallModeCheckbox.checked && cellObj !== startCell && cellObj !== endCell && !waypoints.includes(cellObj)) {
          cellObj.isWall = isDragModeWall;
          cellDiv.classList.toggle("wall", isDragModeWall);
        }
      });
    }
    grid.push(row);
  }

  document.addEventListener("mouseup", () => {
    isMouseDown = false;
  });
}

function onCellClick(cellDiv) {
  const x = +cellDiv.dataset.x;
  const y = +cellDiv.dataset.y;
  const cell = grid[y][x];
  const wallMode = document.getElementById("wallToggle").checked;

  if (wallMode) return;

  if (cell === startCell) {
    cell.cell.classList.remove("start");
    startCell = null;
  } else if (cell === endCell) {
    cell.cell.classList.remove("end");
    endCell = null;
  } else if (waypoints.includes(cell)) {
    cell.cell.classList.remove("waypoint");
    waypoints = waypoints.filter(wp => wp !== cell);
  } else if (!startCell) {
    startCell = cell;
    cell.cell.classList.add("start");
  } else if (!endCell) {
    endCell = cell;
    cell.cell.classList.add("end");
  } else {
    if (waypoints.length >= MAX_WAYPOINTS) {
      alert(`Maximum of ${MAX_WAYPOINTS} waypoints allowed.`);
      return;
    }
    waypoints.push(cell);
    cell.cell.classList.add("waypoint");
  }
}

function resetGrid() {
  isCancelled = true; 
  startCell = null;
  endCell = null;
  createGrid();
  document.getElementById("exploredCount").textContent = "0";
  document.getElementById("pathLength").textContent = "0";
}

function getNeighbors(cell) {
  const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  const result = [];
  for (const [dx, dy] of dirs) {
    const nx = cell.x + dx;
    const ny = cell.y + dy;
    if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
      const neighbor = grid[ny][nx];
      neighbor._moveCost = 1;
      result.push(neighbor);
    }
  }
  return result;
}

async function dijkstraWithPath(start, goal, visualize = false) {
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const dist = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
  const prev = Array.from({ length: rows }, () => Array(cols).fill(null));
  const pq = [start];
  dist[start.y][start.x] = 0;

  const debugOpen = [];
  const debugClosed = [];
  const visualizationQueue = [];

  while (pq.length > 0) {
    if (isCancelled) break;
    pq.sort((a, b) => dist[a.y][a.x] - dist[b.y][b.x]);
    const current = pq.shift();
    if (current === goal) break;

    visited[current.y][current.x] = true;
    if (visualize && current !== start && current !== goal && !waypoints.includes(current)) {
      visualizationQueue.push({ cell: current.cell, type: 'closed' });
    }

    for (const neighbor of getNeighbors(current)) {
      if (isCancelled) break;
      if (neighbor.isWall || visited[neighbor.y][neighbor.x]) continue;
      const alt = dist[current.y][current.x] + 1;
      if (alt < dist[neighbor.y][neighbor.x]) {
        dist[neighbor.y][neighbor.x] = alt;
        prev[neighbor.y][neighbor.x] = current;
        pq.push(neighbor);
        if (visualize && neighbor !== start && neighbor !== goal && !waypoints.includes(neighbor)) {
          visualizationQueue.push({ cell: neighbor.cell, type: 'open' });
        }
      }
    }
  }

  if (visualize) {
    await new Promise(resolve => {
      function animateExploration(queue) {
        if (queue.length === 0) {
          for (const cell of debugOpen) {
            if (isCancelled) break;
            cell.cell.classList.remove("open");
          }
          for (const cell of debugClosed) {
            if (isCancelled) break;
            cell.cell.classList.remove("closed");
          }
          resolve();
          return;
        }
        const cellsToProcess = Math.min(queue.length, 50);
        for (let i = 0; i < cellsToProcess; i++) {
          if (isCancelled) break;
          const item = queue.shift();
          if (item.type === 'closed') {
            item.cell.classList.add("closed");
            debugClosed.push(grid[item.cell.dataset.y][item.cell.dataset.x]);
          } else if (item.type === 'open') {
            item.cell.classList.add("open");
            debugOpen.push(grid[item.cell.dataset.y][item.cell.dataset.x]);
          }
        }
        requestAnimationFrame(() => animateExploration(queue));
      }
      animateExploration(visualizationQueue);
    });
  }

  const path = [];
  let node = goal;
  while (node && node !== start) {
    if (isCancelled) break;
    path.push(node);
    node = prev[node.y][node.x];
  }
  path.reverse();

  const exploredCount = visited.flat().filter(v => v).length;
  return { path, cost: dist[goal.y][goal.x], explored: exploredCount };
}

async function startDijkstraWaypoints() {
  isCancelled = false;
  const debug = document.getElementById("debugToggle").checked;
  if (!startCell || !endCell) {
    alert("Start and End points required");
    return;
  }
  if (waypoints.length > MAX_WAYPOINTS) {
    alert(`Too many waypoints (max ${MAX_WAYPOINTS} supported for performance).`);
    return;
  }
  const points = [startCell, ...waypoints, endCell];
  let minPath = [];
  let minCost = Infinity;
  let exploredTotal = 0;
  const perms = permute(waypoints);

  for (const wp of perms) {
    if (isCancelled) break;
    const sequence = [startCell, ...wp, endCell];
    let fullPath = [], total = 0, exploredSum = 0, failed = false;
    for (let i = 0; i < sequence.length - 1; i++) {
      if (isCancelled) break;
      const res = await dijkstraWithPath(sequence[i], sequence[i + 1], debug);
      if (!res.path.length) {
        failed = true;
        break;
      }
      if (fullPath.length > 0 && res.path.length > 0 && fullPath.at(-1) === res.path[0]) {
        res.path.shift();
      }
      fullPath.push(...res.path);
      total += res.cost;
      exploredSum += res.explored;
    }
    if (!failed && total < minCost) {
      minPath = fullPath;
      minCost = total;
      exploredTotal = exploredSum;
    }
  }

  await new Promise(resolve => {
    const pathVisualizationQueue = [];
    for (const cell of minPath) {
      if (isCancelled) break;
      if (cell !== startCell && cell !== endCell && !waypoints.includes(cell)) {
        pathVisualizationQueue.push(cell.cell);
      }
    }
    function animateCells(queue) {
      if (queue.length === 0) {
        resolve();
        return;
      }
      const cellsToProcess = Math.min(queue.length, 1);
      for (let i = 0; i < cellsToProcess; i++) {
        if (isCancelled) break;
        const cellDiv = queue.shift();
        cellDiv.classList.add("path");
      }
      requestAnimationFrame(() => animateCells(queue));
    }
    animateCells(pathVisualizationQueue);
  });

  const actualPathLength = minPath.filter(cell => cell !== startCell && cell !== endCell && !waypoints.includes(cell)).length;
  document.getElementById("pathLength").textContent = actualPathLength;
  document.getElementById("exploredCount").textContent = exploredTotal;
}

function permute(arr) {
  if (arr.length === 0) return [[]];
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    if (isCancelled) break;
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const p of permute(rest)) {
      if (isCancelled) break;
      result.push([arr[i], ...p]);
    }
  }
  return result;
}

createGrid();
