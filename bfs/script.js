const rows = 20;
const cols = 20;
const grid = [];
let startCell = null;
let endCell = null;
let isMouseDown = false;
let isDragModeWall = true;
let isCancelled = false;

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

async function startBFS() {
    isCancelled = false;
    const directions = getDirectionVectors();

    let exploredCount = 0;
    document.getElementById("exploredCount").textContent = "0";
    document.getElementById("pathLength").textContent = "0";

    if (!startCell || !endCell) {
        alert("Start and End points required");
        return;
    }

    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const prev = Array.from({ length: rows }, () => Array(cols).fill(null));
    const queue = [startCell];
    visited[startCell.y][startCell.x] = true;

    while (queue.length > 0) {
        if (isCancelled) break;
        const current = queue.shift();

        if (current === endCell) {
            await reconstructBFSPath(prev, current);
            return;
        }

        if (current !== startCell && current !== endCell) {
            current.cell.classList.add("closed");
            exploredCount++;
            document.getElementById("exploredCount").textContent = exploredCount;
            await new Promise(r => setTimeout(r, 15));
        }

        for (const [dx, dy] of directions) {
            if (isCancelled) break;
            const nx = current.x + dx;
            const ny = current.y + dy;
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;

            const neighbor = grid[ny][nx];
            if (!visited[ny][nx] && !neighbor.isWall) {
                visited[ny][nx] = true;
                prev[ny][nx] = current;
                queue.push(neighbor);
                if (neighbor !== endCell) neighbor.cell.classList.add("open");
            }
        }
    }


    alert("No path found");
}


async function reconstructBFSPath(prev, end) {
    let current = end;
    let length = 0;
    while (true) {
        if (isCancelled) break;
        const prevCell = prev[current.y][current.x];
        if (!prevCell || prevCell === startCell) break;
        current = prevCell;
        if (current !== startCell && current !== endCell) {
            current.cell.classList.remove("closed");
            current.cell.classList.add("path");
            length++;
            await new Promise(r => setTimeout(r, 30));
        }
    }
    document.getElementById("pathLength").textContent = length;
}

function getDirectionVectors() {
    const mode = document.getElementById("directionMode")?.value || "cw";
    return mode === "cw"
        ? [[0, 1], [1, 0], [0, -1], [-1, 0]]     // 시계 방향: 우, 하, 좌, 상
        : [[0, 1], [-1, 0], [0, -1], [1, 0]];    // 반시계 방향: 우, 상, 좌, 하
}


createGrid();
