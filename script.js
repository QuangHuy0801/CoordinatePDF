let currentPdf = null;
let currentMouseX = 0, currentMouseY = 0;
let currentMode = 'point';
let keypressStartPoint = null;
let clickModeData = [], keypressModeData = [];
let pointCounter = 1, areaCounter = 1;
let temporaryPoint = null;
let isQKeyPressed = false;
let temporaryArea = null;
let currentDisplayMode = 'single';
let currentPage = 1;

let totalPages = 0;

document.getElementById('fileInput').addEventListener('change', handleFileInput);
document.getElementById('modeSelect').addEventListener('change', (e) => {
    currentMode = e.target.value;
    displayCoordinates();
    updateModeInstructions();
});
document.addEventListener('DOMContentLoaded', function() {
    const copyAllBtn = document.getElementById('copyAllBtn');
    const copyXPointsBtn = document.getElementById('copyXPointsBtn');
    copyAllBtn.style.display = 'none';
    copyXPointsBtn.style.display = 'inline-block';
    displayCoordinates();
    updateModeInstructions();
    currentDisplayMode = document.getElementById('pageDisplaySelect').value;
});
document.getElementById('clearButton').addEventListener('click', clear);
document.getElementById('clearAllButton').addEventListener('click', clearAll);
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);
document.getElementById('copyAllBtn').addEventListener('click', copyAllAreas);
document.getElementById('copyXPointsBtn').addEventListener('click', copyXPoints);
document.addEventListener('DOMContentLoaded', function() {
    const copyAllBtn = document.getElementById('copyAllBtn');
    const copyXPointsBtn = document.getElementById('copyXPointsBtn');
    copyAllBtn.style.display = 'none';
    copyXPointsBtn.style.display = 'inline-block';
    displayCoordinates();
});
document.getElementById('pageDisplaySelect').addEventListener('change', (e) => {
    currentDisplayMode = e.target.value;
    currentPage = 1;
    renderPages(currentPdf, currentPage);
    updatePageNavigation();
});

function updateModeInstructions() {
    const instructions = document.getElementById('modeInstructions');
    if (currentMode === 'point') {
        instructions.textContent = 'Press "Ctrl" to mark a point';
    } else {
        instructions.textContent = 'Press and hold "Ctrl", then release to mark an area';
    }
}

function handleFileInput(event) {
    const file = event.target.files[0];
    const fileDisplayArea = document.getElementById('fileDisplayArea');
    if (file && file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = (e) => {
            fileDisplayArea.innerHTML = '';
            pdfjsLib.getDocument({data: e.target.result}).promise.then((pdf) => {
                currentPdf = pdf;
                totalPages = pdf.numPages;
                renderPages(pdf, 1);
                displayPdfInfo(pdf);
                updatePageNavigation();
            });
        };
        reader.readAsArrayBuffer(file);
    } else {
        fileDisplayArea.innerHTML = 'Please select a PDF file.';
    }
}

function renderPages(pdf, pageNumber) {
    const fileDisplayArea = document.getElementById('fileDisplayArea');
    
    if (currentDisplayMode === 'single') {
        fileDisplayArea.innerHTML = '';
        renderPage(pdf, pageNumber);
    } else {
        if (pageNumber === 1) {
            fileDisplayArea.innerHTML = '';
        }
        
        renderPage(pdf, pageNumber).then(() => {
            if (pageNumber < pdf.numPages) {
                renderPages(pdf, pageNumber + 1);
            }
        });
    }
}
function renderPage(pdf, pageNumber) {
    return pdf.getPage(pageNumber).then((page) => {
        const viewport = page.getViewport({scale: 1});
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const scale = document.getElementById('fileDisplayArea').clientWidth / viewport.width;
        const scaledViewport = page.getViewport({scale: scale});

        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        const pdfOverlay = createPdfOverlay(scaledViewport, viewport, pageNumber);
        pdfOverlay.appendChild(canvas);

        // Cập nhật thông tin PDF với kích thước trang hiện tại
        const width = Math.round(viewport.width);
        const height = Math.round(viewport.height);
        document.getElementById('pdfInfo').innerHTML = `
            ${width} x ${height}
        `;

        return page.render({canvasContext: context, viewport: scaledViewport}).promise.then(() => {
            return page.getTextContent();
        }).then((textContent) => {
            const textLayerDiv = createTextLayerDiv(scaledViewport);
            pdfOverlay.appendChild(textLayerDiv);
            pdfjsLib.renderTextLayer({
                textContent: textContent,
                container: textLayerDiv,
                viewport: scaledViewport,
                textDivs: []
            });
        });
    });
}

function updatePageNavigation() {
    const pageNavigation = document.getElementById('pageNavigation');
    if (currentDisplayMode === 'single') {
        pageNavigation.innerHTML = `
            <button id="prevPage">Previous</button>
            <span>Page ${currentPage} of ${totalPages}</span>
            <button id="nextPage">Next</button>
        `;
        document.getElementById('prevPage').addEventListener('click', () => changePage(-1));
        document.getElementById('nextPage').addEventListener('click', () => changePage(1));
    } else {
        pageNavigation.innerHTML = '';
    }
}

function changePage(delta) {
    currentPage = Math.max(1, Math.min(currentPage + delta, totalPages));
    renderPages(currentPdf, currentPage);
    updatePageNavigation();
}

function createPdfOverlay(scaledViewport, viewport, pageNumber) {
    const pdfOverlay = document.createElement('div');
    pdfOverlay.className = 'pdfOverlay';
    pdfOverlay.style.width = `${scaledViewport.width}px`;
    pdfOverlay.style.height = `${scaledViewport.height}px`;
    pdfOverlay.setAttribute('data-original-width', viewport.width);
    pdfOverlay.setAttribute('data-original-height', viewport.height);
    pdfOverlay.setAttribute('data-page-number', pageNumber);
    pdfOverlay.addEventListener('mousemove', handleMouseMove);
    document.getElementById('fileDisplayArea').appendChild(pdfOverlay);
    return pdfOverlay;
}

function createTextLayerDiv(viewport) {
    const textLayerDiv = document.createElement('div');
    textLayerDiv.className = 'textLayer';
    textLayerDiv.style.width = `${viewport.width}px`;
    textLayerDiv.style.height = `${viewport.height}px`;
    return textLayerDiv;
}

// function handleKeyPress(e) {
//     if (e.key !== 'q') return;
//     const overlay = document.elementFromPoint(currentMouseX, currentMouseY).closest('.pdfOverlay');
//     if (!overlay) return;

//     const clickEvent = { clientX: currentMouseX, clientY: currentMouseY, target: overlay };
//     if (currentMode === 'area') {
//         if (!keypressStartPoint) {
//             keypressStartPoint = getCoordinates(clickEvent);
//             markTemporaryPoint(keypressStartPoint);
//         } else {
//             const endPoint = getCoordinates(clickEvent);
//             markArea(keypressStartPoint, endPoint);
//             removeTemporaryPoint();
//             keypressStartPoint = null;
//         }
//     } else if (currentMode === 'point') {
//         markCoordinate(clickEvent);
//     }
// }
function handleKeyDown(e) {
    if ((e.key === 'Control') && !isQKeyPressed) {
        isQKeyPressed = true;
        const overlay = document.elementFromPoint(currentMouseX, currentMouseY).closest('.pdfOverlay');
        if (overlay) {
            const coordinates = getCoordinates({ clientX: currentMouseX, clientY: currentMouseY, target: overlay });
            if (currentMode === 'area') {
                keypressStartPoint = coordinates;
                markTemporaryPoint(keypressStartPoint);
                updateTemporaryArea(keypressStartPoint, keypressStartPoint);
            } else if (currentMode === 'point') {
                markCoordinate({ clientX: currentMouseX, clientY: currentMouseY, target: overlay });
            }
        }
    }
}

function handleKeyUp(e) {
    if (e.key === 'Control') {
        isQKeyPressed = false;
        const overlay = document.elementFromPoint(currentMouseX, currentMouseY).closest('.pdfOverlay');
        if (overlay && currentMode === 'area' && keypressStartPoint) {
            const endPoint = getCoordinates({ clientX: currentMouseX, clientY: currentMouseY, target: overlay });
            markArea(keypressStartPoint, endPoint);
            removeTemporaryPoint();
            removeTemporaryArea();
            keypressStartPoint = null;
        }
    }
}
function removeTemporaryArea() {
    if (temporaryArea) {
        temporaryArea.remove();
        temporaryArea = null;
    }
}
function markTemporaryPoint(coordinates) {
    removeTemporaryPoint();
    const overlay = document.querySelector(`.pdfOverlay[data-page-number="${coordinates.page}"]`);
    if (overlay) {
        temporaryPoint = document.createElement('div');
        temporaryPoint.className = 'temporaryPoint';
        temporaryPoint.style.left = `${coordinates.clickX}px`;
        temporaryPoint.style.top = `${coordinates.clickY}px`;
        
        const numberElement = document.createElement('span');
        numberElement.className = 'pointNumber';
        numberElement.textContent = 'Start';
        temporaryPoint.appendChild(numberElement);

        overlay.appendChild(temporaryPoint);
    }
}

function removeTemporaryPoint() {
    if (temporaryPoint) {
        temporaryPoint.remove();
        temporaryPoint = null;
    }
}

function markCoordinate(e) {
    const coordinates = getCoordinates(e);
    if (!coordinates) return; 

    const coordinateList = document.getElementById('coordinateList');

    const listItem = document.createElement('li');
    listItem.innerHTML = `
        <span>${pointCounter}. x=${Math.round(coordinates.x)}, y=${Math.round(coordinates.y)}</span>
        <button class="deleteBtn" data-point-id="${pointCounter}">&#9747;</button>
    `;
    coordinateList.appendChild(listItem);

    const clickPoint = createClickPoint(coordinates, pointCounter);
    e.target.appendChild(clickPoint);

    clickModeData.push({...coordinates, id: pointCounter});
    console.log(`Marked at PDF coordinates - ${listItem.textContent}`);
    pointCounter++;

    listItem.querySelector('.deleteBtn').addEventListener('click', deletePoint);
}

function createClickPoint(coordinates, id) {
    const clickPoint = document.createElement('div');
    clickPoint.className = 'clickPoint';
    clickPoint.setAttribute('data-point-id', id);
    clickPoint.style.left = `${coordinates.clickX}px`;
    clickPoint.style.top = `${coordinates.clickY}px`;
    
    const numberElement = document.createElement('span');
    numberElement.className = 'pointNumber';
    numberElement.textContent = id;
    clickPoint.appendChild(numberElement);

    return clickPoint;
}

function handleMouseMove(e) {
    const coordinates = getCoordinates(e);
    const pdfCoordinates = document.getElementById('pdfCoordinates');
    currentMouseX = e.clientX;
    currentMouseY = e.clientY;
    pdfCoordinates.textContent = `x=${Math.round(coordinates.x)},  y=${Math.round(coordinates.y)}`;
    pdfCoordinates.style.display = 'block';

    if (isQKeyPressed && currentMode === 'area' && keypressStartPoint) {
        updateTemporaryArea(keypressStartPoint, coordinates);
    }
}
function updateTemporaryArea(start, end) {
    if (!temporaryArea) {
        temporaryArea = document.createElement('div');
        temporaryArea.className = 'temporaryArea';
        const overlay = document.querySelector(`.pdfOverlay[data-page-number="${start.page}"]`);
        if (overlay) {
            overlay.appendChild(temporaryArea);
        }
    }

    const [x1, y1, width, height] = calculateAreaDimensions(start, end);
    Object.assign(temporaryArea.style, {
        left: `${x1}px`,
        top: `${y1}px`,
        width: `${width}px`,
        height: `${height}px`,
        position: 'absolute',
        border: '2px dashed red',
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
        pointerEvents: 'none'
    });
}
function getCoordinates(e) {
    const overlay = e.target.closest('.pdfOverlay');
    if (!overlay) return null;

    const pageNumber = overlay.getAttribute('data-page-number');
    const originalWidth = parseFloat(overlay.getAttribute('data-original-width'));
    const originalHeight = parseFloat(overlay.getAttribute('data-original-height'));
    const bounds = overlay.getBoundingClientRect();

    const clickX = e.clientX - bounds.left;
    const clickY = e.clientY - bounds.top;

    const x = (clickX / bounds.width) * originalWidth;
    const y = (clickY / bounds.height) * originalHeight;

    return {
        x: x,
        y: originalHeight - y,
        clickX: clickX,
        clickY: clickY,
        page: pageNumber
    };
}

function deleteArea(areaId) {
    keypressModeData = keypressModeData.filter(area => area.id !== areaId);
    document.querySelector(`.deleteBtn[data-area-id="${areaId}"]`).closest('li').remove();
    document.querySelector(`.markedArea[data-area-id="area-${areaId}"]`).remove();
    displayCoordinates();
    checkAndResetAreaCounter();
    console.log(`Deleted area ${areaId}.`);
}

function checkAndResetAreaCounter() {
    if (keypressModeData.length === 0) {
        areaCounter = 1;
        console.log("All areas deleted. Reset areaCounter to 1.");
    }
}

function markArea(start, end) {
    const overlay = document.querySelector(`.pdfOverlay[data-page-number="${start.page}"]`);
    if (overlay && start.page === end.page) {
        const markedArea = createMarkedArea(start, end);
        insertMarkedArea(overlay, markedArea);

        const areaData = {
            page: start.page,
            x_top_left: Math.round(Math.min(start.x, end.x)),
            y_top_left: Math.round(Math.max(start.y, end.y)),
            x_bottom_right: Math.round(Math.max(start.x, end.x)),
            y_bottom_right: Math.round(Math.min(start.y, end.y)),
            id: areaCounter
        };
        keypressModeData.push(areaData);
        addAreaToList(areaData);
        areaCounter++;
    }
}
function createMarkedArea(start, end) {
    const markedArea = document.createElement('div');
    markedArea.className = 'markedArea';
    markedArea.setAttribute('data-area-id', `area-${areaCounter}`);
    const [x1, y1, width, height] = calculateAreaDimensions(start, end);
    Object.assign(markedArea.style, {left: `${x1}px`, top: `${y1}px`, width: `${width}px`, height: `${height}px`});

    const numberElement = document.createElement('div');
    numberElement.className = 'areaNumber';
    numberElement.textContent = areaCounter;
    markedArea.appendChild(numberElement);

    return markedArea;
}

function calculateAreaDimensions(start, end) {
    const x1 = Math.min(start.clickX, end.clickX);
    const y1 = Math.min(start.clickY, end.clickY);
    const width = Math.abs(end.clickX - start.clickX);
    const height = Math.abs(end.clickY - start.clickY);
    return [x1, y1, width, height];
}

function insertMarkedArea(overlay, markedArea) {
    const existingAreas = overlay.querySelectorAll('.markedArea');
    let inserted = false;

    existingAreas.forEach(existingArea => {
        const areaId = parseInt(existingArea.getAttribute('data-area-id').split('-')[1]);
        if (areaId > areaCounter && !inserted) {
            overlay.insertBefore(markedArea, existingArea);
            inserted = true;
        }
    });

    if (!inserted) {
        overlay.appendChild(markedArea);
    }
}

function addAreaToList(areaData) {
    const coordinateList = document.getElementById('coordinateList');
    const listItem = document.createElement('li');
    const areaText = `{
    "x_top_left": ${areaData.x_top_left},
    "y_top_left": ${areaData.y_top_left},
    "x_bottom_right": ${areaData.x_bottom_right},
    "y_bottom_right": ${areaData.y_bottom_right}
}`;
    listItem.innerHTML = `
    <div class="area-container">
        <span>Area ${areaData.id}:</span>
                <div class="button-container-area">
        <button class="copyBtn" data-area-id="${areaData.id}">Copy</button>
        <button class="deleteBtn" data-area-id="${areaData.id}">&#9747;</button>
        </div>
        <pre>${areaText}</pre>
        </div>
    `;
    coordinateList.appendChild(listItem);
    listItem.querySelector('.deleteBtn').addEventListener('click', () => deleteArea(areaData.id));
    listItem.querySelector('.copyBtn').addEventListener('click', (e) => copyAreaToClipboard(areaText, e.target));

}
function copyAreaToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        button.textContent = 'Copied!';
        button.classList.add('copied');
        setTimeout(() => {
            button.textContent = 'Copy';
            button.classList.remove('copied');
        }, 2000); // Đổi lại sau 2 giây
    }, (err) => {
        console.error('Could not copy text: ', err);
        button.textContent = 'Error';
        setTimeout(() => {
            button.textContent = 'Copy';
        }, 2000);
    });
}

function displayPdfInfo(pdf) {
    pdf.getPage(1).then(page => {
        const viewport = page.getViewport({scale: 1});
        const width = Math.round(viewport.width);
        const height = Math.round(viewport.height);
        document.getElementById('pdfInfo').innerHTML = `
            ${width} x ${height}
        `;
    });
}

function deletePoint(e) {
    const pointId = parseInt(e.target.getAttribute('data-point-id'));
    clickModeData = clickModeData.filter(point => point.id !== pointId);
    e.target.closest('li').remove();
    document.querySelector(`.clickPoint[data-point-id="${pointId}"]`).remove();
    displayCoordinates();
    checkAndResetPointCounter();
}

function checkAndResetPointCounter() {
    if (clickModeData.length === 0) {
        pointCounter = 1;
        console.log("All points deleted. Reset pointCounter to 1.");
    }
}

function displayCoordinates() {
    const coordinateList = document.getElementById('coordinateList');
    coordinateList.innerHTML = '';
    
    const copyAllBtn = document.getElementById('copyAllBtn');
    const copyXPointsBtn = document.getElementById('copyXPointsBtn');
    
    // Luôn ẩn/hiện nút dựa trên chế độ hiện tại
    copyAllBtn.style.display = currentMode === 'area' ? 'inline-block' : 'none';
    copyXPointsBtn.style.display = currentMode === 'point' ? 'inline-block' : 'none';
    
    if (currentMode === 'point') {
        clickModeData.forEach((coordinates) => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <span>${coordinates.id}. x=${Math.round(coordinates.x)}, y=${Math.round(coordinates.y)}</span>
                <button class="deleteBtn" data-point-id="${coordinates.id}">&#9747;</button>
            `;
            coordinateList.appendChild(listItem);
            listItem.querySelector('.deleteBtn').addEventListener('click', deletePoint);
        });
    } else { // area mode
        keypressModeData.forEach((coordinates) => {
            const areaText = `{
    "x_top_left": ${coordinates.x_top_left},
    "y_top_left": ${coordinates.y_top_left},
    "x_bottom_right": ${coordinates.x_bottom_right},
    "y_bottom_right": ${coordinates.y_bottom_right}
}`;
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <div class="area-container">
                    <span>Area ${coordinates.id}:</span>
                    <div class="button-container-area">
                        <button class="copyBtn" data-area-id="${coordinates.id}">Copy</button>
                        <button class="deleteBtn" data-area-id="${coordinates.id}">&#9747;</button>
                    </div>
                    <pre>${areaText}</pre>
                </div>
            `;
            coordinateList.appendChild(listItem);
            listItem.querySelector('.deleteBtn').addEventListener('click', () => deleteArea(coordinates.id));
            listItem.querySelector('.copyBtn').addEventListener('click', (e) => copyAreaToClipboard(areaText, e.target));
        });
    }
}

function copyAllAreas() {
    const allAreasText = keypressModeData.map(area => `Area ${area.id}:
{
    "x_top_left": ${area.x_top_left},
    "y_top_left": ${area.y_top_left},
    "x_bottom_right": ${area.x_bottom_right},
    "y_bottom_right": ${area.y_bottom_right}
}`).join('\n\n');

    const copyAllBtn = document.getElementById('copyAllBtn');
    navigator.clipboard.writeText(allAreasText).then(() => {
        copyAllBtn.textContent = 'All Copied!';
        copyAllBtn.classList.add('copied');
        setTimeout(() => {
            copyAllBtn.textContent = 'Copy All Areas';
            copyAllBtn.classList.remove('copied');
        }, 2000);
    }, (err) => {
        console.error('Could not copy text: ', err);
        copyAllBtn.textContent = 'Error';
        setTimeout(() => {
            copyAllBtn.textContent = 'Copy All Areas';
        }, 2000);
    });
}

function copyXPoints() {
    const xPoints = clickModeData.map(point => Math.round(point.x)).join(',');
    
    navigator.clipboard.writeText(xPoints).then(() => {
        const copyXPointsBtn = document.getElementById('copyXPointsBtn');
        copyXPointsBtn.textContent = 'Copied!';
        copyXPointsBtn.classList.add('copied');
        setTimeout(() => {
            copyXPointsBtn.textContent = 'Copy X Points';
            copyXPointsBtn.classList.remove('copied');
        }, 2000);
    }, (err) => {
        console.error('Could not copy text: ', err);
        const copyXPointsBtn = document.getElementById('copyXPointsBtn');
        copyXPointsBtn.textContent = 'Error';
        setTimeout(() => {
            copyXPointsBtn.textContent = 'Copy X Points';
        }, 2000);
    });
}



function clear() {
    document.getElementById('coordinateList').innerHTML = '';
    if (currentMode === 'point') {
        document.querySelectorAll('.clickPoint').forEach(point => point.remove());
        clickModeData = [];
        pointCounter = 1;
    } else if (currentMode === 'area') {
        document.querySelectorAll('.markedArea').forEach(area => area.remove());
        keypressModeData = [];
        areaCounter = 1;
    }
    keypressStartPoint = null;
    removeTemporaryPoint();
    console.log("Cleared all points and areas. Reset counters.");
    removeTemporaryPoint();
    removeTemporaryArea();
    console.log("Cleared all points and areas. Reset counters.");
}


function clearAll() {
    document.getElementById('coordinateList').innerHTML = '';
    document.querySelectorAll('.clickPoint').forEach(point => point.remove());
    clickModeData = [];
    pointCounter = 1;
    document.querySelectorAll('.markedArea').forEach(area => area.remove());
    keypressModeData = [];
    areaCounter = 1;
    keypressStartPoint = null;
    removeTemporaryPoint();
    console.log("Cleared all points and areas. Reset counters.");
    removeTemporaryPoint();
    removeTemporaryArea();
    console.log("Cleared all points and areas. Reset counters.");
}