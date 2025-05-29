let isMouseDown = false;
let isDragModeWall = true;
let isCancelled = false;

const rows = 20;
const cols = 20;
const grid = [];
let startCell = null;
let endCell = null;

function createGrid() {
  const container = document.getElementById("grid-container");
  const wallModeCheckbox = document.getElementById("wallToggle");

  container.innerHTML = "";
  grid.length = 0;

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
          if (cellObj !== startCell && cellObj !== endCell) {
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
        if (isMouseDown && wallModeCheckbox.checked && cellObj !== startCell && cellObj !== endCell) {
          cellObj.isWall = isDragModeWall;
          cellDiv.classList.toggle("wall", isDragModeWall);
        }
      });
    }
    grid.push(row);
  }
}

function onCellClick(cellDiv) {
  const x = +cellDiv.dataset.x;
  const y = +cellDiv.dataset.y;
  const cell = grid[y][x];
  const wallMode = document.getElementById("wallToggle").checked;

  if (wallMode) {
    if (cell !== startCell && cell !== endCell) {
      cell.isWall = !cell.isWall;
      cell.cell.classList.toggle("wall", cell.isWall);
    }
    return;
  }

  if (cell === startCell) {
    cell.cell.classList.remove("start");
    startCell = null;
    return;
  }

  if (cell === endCell) {
    cell.cell.classList.remove("end");
    endCell = null;
    return;
  }

  if (!startCell) {
    startCell = cell;
    cell.cell.classList.add("start");
  } else if (!endCell && cell !== startCell) {
    endCell = cell;
    cell.cell.classList.add("end");
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

function heuristic(a, b) {
  const type = document.getElementById("heuristicSelect").value;
  if (type === "euclidean") {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

async function startAStar() {
  let exploredCount = 0;
  isCancelled = false;
  document.getElementById("exploredCount").textContent = "0";
  document.getElementById("pathLength").textContent = "0";

  if (!startCell || !endCell) return alert("Start and End points required");

  const openSet = [startCell];
  const cameFrom = Array(rows).fill(null).map(() => Array(cols).fill(null));
  const gScore = Array(rows).fill(null).map(() => Array(cols).fill(Infinity));
  const fScore = Array(rows).fill(null).map(() => Array(cols).fill(Infinity));

  gScore[startCell.y][startCell.x] = 0;
  fScore[startCell.y][startCell.x] = heuristic(startCell, endCell);

  while (openSet.length > 0) {
    if (isCancelled) break;
    openSet.sort((a, b) => fScore[a.y][a.x] - fScore[b.y][b.x]);
    const current = openSet.shift();

    if (current === endCell) return await reconstructPath(cameFrom, current);

    if (current !== startCell && current !== endCell) {
      current.cell.classList.add("closed");
      exploredCount++;
      document.getElementById("exploredCount").textContent = exploredCount;
    }

    for (const neighbor of getNeighbors(current)) {
      if (isCancelled) break;
      if (neighbor.isWall) continue;
      const moveCost = neighbor._moveCost || 1;
      const tentativeG = gScore[current.y][current.x] + moveCost;

      if (tentativeG < gScore[neighbor.y][neighbor.x]) {
        cameFrom[neighbor.y][neighbor.x] = current;
        gScore[neighbor.y][neighbor.x] = tentativeG;
        const h = heuristic(neighbor, endCell);
        fScore[neighbor.y][neighbor.x] = tentativeG + h;
        updateCellCost(neighbor, tentativeG, h, tentativeG + h);

        if (!openSet.includes(neighbor)) {
          openSet.push(neighbor);
          if (neighbor !== startCell && neighbor !== endCell) {
            neighbor.cell.classList.add("open");
          }
        }
      }
    }
    await new Promise(r => setTimeout(r, 20));
  }

  alert("No path found");
}

async function reconstructPath(cameFrom, current) {
  let length = 0;
  while (true) {
    if (isCancelled) break;
    const prev = cameFrom[current.y][current.x];
    if (!prev || prev === startCell) break;
    current = prev;
    if (current !== startCell && current !== endCell) {
      current.cell.classList.add("path");
      length++;
    }
    await new Promise(r => setTimeout(r, 30));
  }
  document.getElementById("pathLength").textContent = length;
}

function getNeighbors(cell) {
  const type = document.getElementById("heuristicSelect").value;
  const dirs = (type === "euclidean")
    ? [[0,1],[1,0],[-1,0],[0,-1],[-1,-1],[-1,1],[1,-1],[1,1]]
    : [[0,1],[1,0],[-1,0],[0,-1]];

  const result = [];
  for (const [dx, dy] of dirs) {
    if (isCancelled) break;
    const nx = cell.x + dx;
    const ny = cell.y + dy;
    if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
      const neighbor = grid[ny][nx];
      neighbor._moveCost = (dx === 0 || dy === 0) ? 1 : 1.4;
      result.push(neighbor);
    }
  }
  return result;
}

function updateCellCost(cellObj, g, h, f) {
  if (cellObj === startCell || cellObj === endCell || cellObj.isWall) return;
  let costEl = cellObj.cell.querySelector('.cost');
  if (!costEl) {
    costEl = document.createElement('div');
    costEl.className = 'cost';
    cellObj.cell.appendChild(costEl);
  }
  costEl.textContent = `${f.toFixed(1)}`;
}

document.addEventListener("mouseup", () => {
  isMouseDown = false;
});

createGrid();
