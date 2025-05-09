// DOM
const main = document.getElementById('main');
const outputElement = document.getElementById('output');
const pdf_input = document.getElementById('input');
const preview_container = document.getElementById('preview_container');
const preview_canvas = document.getElementById('preview_canvas');
const _c_preview_view = document.getElementById('_c_preview_view');
const _c_preview_hide = document.getElementById('_c_preview_hide');
const _c_preview_wipe = document.getElementById('_c_preview_wipe');
const _c_preview_reset = document.getElementById('_c_preview_reset');
const _c_preview_delete = document.getElementById('_c_preview_delete');
const _c_move_doc_left = document.getElementById('_c_move_doc_left');
const _c_move_doc_right = document.getElementById('_c_move_doc_right');
const config_container = document.getElementById('config_container');
const multipage_help = document.getElementById('multipage_help');
const multipage_prev = document.getElementById('multipage_prev');
const multipage_next = document.getElementById('multipage_next');
const multipage_count = document.getElementById('multipage_count');
const action_button = document.getElementById('action_button');

// Global
var fileBuffers = [];
var PDFDocs = [];
var num_pages = [];
var renderInProgress = false;

// Which doc is a page
function whatDoc(i)
{
	var docIndex = 0;
	var pageIndex = i;
	for(let j = 0; j < PDFDocs.length; j++)
	{
		if(pageIndex > num_pages[j])
		{
			// Page index out of bounds
			pageIndex -= num_pages[j];
			docIndex++;
			continue;
		}
		// Page index in bounds
		else
		{
			return docIndex;
		}
	}
}

// Which page within a doc is a page
function whatPage(i)
{
	var pageIndex = i;
	for(let j = 0; j < PDFDocs.length; j++)
	{
		if(pageIndex > num_pages[j])
		{
			// Page index out of bounds
			pageIndex -= num_pages[j];
			continue;
		}
		// Page index in bounds
		else
		{
			return pageIndex;
		}
	}
}

// Render page
async function renderPDFPage(i)
{
	var page;
	var pageIndex = i;

	// Loop through docs until the index is within the doc's range
	for(let j = 0; j < PDFDocs.length; j++)
	{
		if(pageIndex > num_pages[j])
		{
			// Page index out of bounds
			pageIndex -= num_pages[j];
			continue;
		}
		// Page index in bounds
		else
		{
			page = await PDFDocs[j].getPage(pageIndex);
			break;
		}
	}

	// Set up canvases
	const viewport = page.getViewport({scale: CONST_DPI/72});
	canvas.width = viewport.width >= 600 ? 600 : viewport.width;
	canvas.height = viewport.height >= 600 ? 600: viewport.height;
	vCanvas.width = viewport.width;
	vCanvas.height = viewport.height;

	// Render page
	const renderTask = page.render({canvasContext: vContext, viewport});
	await renderTask.promise;
}

// Updates the page label
function updatePageCount()
{
	multipage_count.innerHTML = 'p:' + (whatPage(mainStruct.current)) + '/' + (num_pages[whatDoc(mainStruct.current)]) + ', ';
	multipage_count.innerHTML += 'd:' + (whatDoc(mainStruct.current) + 1) + '/' + (whatDoc(mainStruct.total) + 1) + ', ';
	multipage_count.innerHTML += 't:' + mainStruct.current + '/' + mainStruct.total;
}

// -------------------- OUTPUT -----------------------------

function getLineCount(textarea)
{
    return textarea.value.split('\n').length - 1;
}
function resizeOutput(textarea)
{
	textarea.style.height = "calc(1.2rem * " + getLineCount(textarea) + " + 70px)";
}
function clearOutput(textarea)
{
	textarea.value = "";
}
clearOutput(outputElement);

// ---------------------------------------------------------

// -------------------- CANVAS -----------------------------

// Main canvas
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
context.imageSmoothingEnabled = false;

// Virtual canvas
const vCanvas = document.createElement('canvas');
const vContext = vCanvas.getContext('2d');
vContext.imageSmoothingEnabled = false;

// Constants
const CONST_DPI = 144;
const CONST_ZOOMFACTOR = 1.1;
const CONST_MOBILEZOOMFACTOR = 1.05;

// Draw, vCanvas into canvas
function draw()
{
	// draw pdf
	context.setTransform(1, 0, 0, 1, 0, 0);
	context.clearRect(0, 0, canvas.width, canvas.height);
	context.imageSmoothingEnabled = false;
	context.setTransform(previewWindow.scale, 0, 0, previewWindow.scale, previewWindow.offsetX, previewWindow.offsetY);
	context.drawImage(vCanvas, 0, 0);
}

// Click
function press(x, y)
{
	const rect = canvas.getBoundingClientRect();
	previewWindow.isDragging = true;
	previewWindow.isTouchZooming = false;
	previewWindow.lastX = x - rect.left;
	previewWindow.lastY = y - rect.top;
}

// Move
function move(x, y)
{
	if(!previewWindow.isDragging || previewWindow.isTouchZooming) return;
	const rect = canvas.getBoundingClientRect();

	const dx = x - rect.left - previewWindow.lastX;
	const dy = y - rect.top - previewWindow.lastY;

	previewWindow.offsetX += dx;
	previewWindow.offsetY += dy;

	previewWindow.lastX = x - rect.left;
	previewWindow.lastY = y - rect.top;

	draw();
}

// Zoom
function zoom(e)
{
	const rect = canvas.getBoundingClientRect();

	const mouseX = e.clientX - rect.left;
	const mouseY = e.clientY - rect.top;
	const scaleFactor = e.deltaY <= 0 ? CONST_ZOOMFACTOR : 1 / CONST_ZOOMFACTOR;

	const worldX = (mouseX - previewWindow.offsetX) / previewWindow.scale;
	const worldY = (mouseY - previewWindow.offsetY) / previewWindow.scale;

	previewWindow.scale *= scaleFactor;

	previewWindow.offsetX = mouseX - worldX * previewWindow.scale;
	previewWindow.offsetY = mouseY - worldY * previewWindow.scale;

	draw();
}

// End
function end()
{
	previewWindow.isDragging = false;
	canvas.classList.remove('grabbing');
}

// Mobile
function getTouchesDist(touch1, touch2)
{
	const dx = touch1.clientX - touch2.clientX;
	const dy = touch1.clientY - touch2.clientY;
	return Math.hypot(dx, dy);
}
function getTouchesX(touch1, touch2)
{
	return (touch1.clientX + touch2.clientX)/2;
}
function getTouchesY(touch1, touch2)
{
	return (touch1.clientY + touch2.clientY)/2;
}
function mobileStartZoom(touch1, touch2)
{
	previewWindow.isDragging = false;
	previewWindow.isTouchZooming = true;
	previewWindow.lastTouchesDist = getTouchesDist(touch1, touch2);
}
function mobileZoom(touch1, touch2)
{
	const rect = canvas.getBoundingClientRect();

	const touchX = getTouchesX(touch1, touch2) - rect.left;
	const touchY = getTouchesY(touch1, touch2) - rect.top;
	const scaleFactor = getTouchesDist(touch1, touch2) - previewWindow.lastTouchesDist <= 0 ? 1 / CONST_MOBILEZOOMFACTOR : CONST_MOBILEZOOMFACTOR;

	const worldX = (touchX - previewWindow.offsetX) / previewWindow.scale;
	const worldY = (touchY - previewWindow.offsetY) / previewWindow.scale;

	previewWindow.scale *= scaleFactor;

	previewWindow.offsetX = touchX - worldX * previewWindow.scale;
	previewWindow.offsetY = touchY - worldY * previewWindow.scale;

	previewWindow.lastTouchesDist = getTouchesDist(touch1, touch2);

	draw();
}
function mobileEnd()
{
	previewWindow.isDragging = false;
	previewWindow.isTouchZooming = false;
}

// ---------------------------------------------------------

// -------------------- PREVIEW ----------------------------

// Preview window stuff
var previewWindow =
{
	scale: 1,
	lastTouchesDist: 0,
	lastX: 0,
	lastY: 0,
	offsetX: 0,
	offsetY: 0,
	isDragging: false,
	isTouchZooming: false,
};

// Resets preview
function resetPreviewWindow()
{
	previewWindow =
	{
		scale: 1,
		lastTouchesDist: 0,
		lastX: 0,
		lastY: 0,
		offsetX: 0,
		offsetY: 0,
		isDragging: false,
		isTouchZooming: false,
	};
}

// ---------------------------------------------------------

// -------------------- BROWSING ---------------------------

// Store user selection
var mainStruct = 
{
	current: 1,
	total: 1,
};

// Resets user selection
function resetMainStruct(len)
{
	mainStruct = 
	{
		current: 1,
		total: len,
	};
}

// ---------------------------------------------------------

// Main logic
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';
pdf_input.onchange = async (e) =>
{
	// Disable UI (reset)
	clearOutput(outputElement);
	config_container.classList.add('hidden');
	multipage_help.classList.add('hidden');

	// Get files
    const files = e.target.files;
	if (!files || files.length <= 1 || files.length >= 20) return;

	// Get all files and copy the buffers
	for(const file of files)
	{
		if (file.type !== "application/pdf") continue;

		// Add file buffers
		const arrBuffer = await file.arrayBuffer();
		fileBuffers.push(arrBuffer.slice(0));

		PDFDocs.push(await pdfjsLib.getDocument({data: arrBuffer}).promise);
	}

	var totalPages = 0;
	// Initialize num_pages
	for(const doc of PDFDocs)
	{
		num_pages.push(doc.numPages);
		totalPages += doc.numPages;
	}

	// Reset docs handler
	resetMainStruct(totalPages);

	// Reset preview window
	resetPreviewWindow();

	// Render 1st page
	renderInProgress = true;
	await renderPDFPage(1);
	draw();
	renderInProgress = false;

	// Enable UI
	config_container.classList.remove('hidden');
	multipage_help.classList.remove('hidden');
	updatePageCount();
}

// -------------------- EVENT LISTENERS --------------------

// -------------------- CANVAS LISTENERS -------------------

// -------------------- PC IMPLEMENTATION ------------------
canvas.addEventListener('wheel', (e)=>
{
	e.preventDefault();
	zoom(e);
});
canvas.addEventListener('mousedown', (e)=>
{
	canvas.classList.add('grabbing');
	press(e.clientX, e.clientY);
});
canvas.addEventListener('mousemove', (e)=>
{
	e.preventDefault();
	move(e.clientX, e.clientY);
});
canvas.addEventListener('mouseup', ()=>
{
	end();
});
canvas.addEventListener('mouseleave', ()=>
{
	end();
});

// -------------------- MOBILE IMPLEMENTATION --------------
canvas.addEventListener('touchstart', function(e)
{
	e.preventDefault();
	if(e.touches.length == 1)
	{
		press(e.touches[0].clientX, e.touches[0].clientY);
	}
	else if(e.touches.length == 2)
	{
		mobileStartZoom(e.touches[0], e.touches[1]);
	}
}, {passive: false});
canvas.addEventListener('touchmove', function(e)
{
	e.preventDefault();
	if(e.touches.length == 1)
	{
		move(e.touches[0].clientX, e.touches[0].clientY);
	}
	else if(e.touches.length == 2)
	{
		mobileZoom(e.touches[0], e.touches[1]);
	}
}, {passive: false});
canvas.addEventListener('touchend', ()=>
{
	mobileEnd();
}, {passive: false});
canvas.addEventListener('touchcancel', ()=>
{
	mobileEnd();
}, {passive: false});

// ---------------------------------------------------------

// -------------------- OTHER LISTENERS --------------------

// View preview
_c_preview_view.addEventListener('click', function()
{
	preview_container.classList.toggle('hidden');
	main.classList.toggle('blurred');
});

// Hide preview
_c_preview_hide.addEventListener('click', function()
{
	preview_container.classList.toggle('hidden');
	main.classList.toggle('blurred');
});

// Multipage previous page
multipage_prev.addEventListener('click', async function()
{
	if(mainStruct.current != 1 && !renderInProgress)
	{
		renderInProgress = true;
		mainStruct.current -= 1;
		await renderPDFPage(mainStruct.current);
		draw();
		updatePageCount();
		renderInProgress = false;
	}
});

// Multipage next page
multipage_next.addEventListener('click', async function()
{
	if(mainStruct.current != mainStruct.total && !renderInProgress)
	{
		renderInProgress = true;
		mainStruct.current += 1;
		await renderPDFPage(mainStruct.current);
		draw();
		updatePageCount();
		renderInProgress = false;
	}
});

// Move doc left
_c_move_doc_left.addEventListener('click', async function()
{
	let curr_doc_num = whatDoc(mainStruct.current);
	if(curr_doc_num != 0 && !renderInProgress)
	{
		renderInProgress = true;
		// Swap to the left
		const tempFB = fileBuffers[curr_doc_num];
		const tempPD = PDFDocs[curr_doc_num];
		const tempNP = num_pages[curr_doc_num];
		fileBuffers[curr_doc_num] = fileBuffers[curr_doc_num - 1];
		PDFDocs[curr_doc_num] = PDFDocs[curr_doc_num - 1];
		num_pages[curr_doc_num] = num_pages[curr_doc_num - 1];
		fileBuffers[curr_doc_num - 1] = tempFB;
		PDFDocs[curr_doc_num - 1] = tempPD;
		num_pages[curr_doc_num - 1] = tempNP;
		// Redraw current position
		await renderPDFPage(mainStruct.current);
		draw();
		updatePageCount();
		renderInProgress = false;
	}
});

// Move doc right
_c_move_doc_right.addEventListener('click', async function()
{
	let curr_doc_num = whatDoc(mainStruct.current);
	if(curr_doc_num != PDFDocs.length - 1 && !renderInProgress)
	{
		renderInProgress = true;
		// Swap to the right
		const tempFB = fileBuffers[curr_doc_num];
		const tempPD = PDFDocs[curr_doc_num];
		const tempNP = num_pages[curr_doc_num];
		fileBuffers[curr_doc_num] = fileBuffers[curr_doc_num + 1];
		PDFDocs[curr_doc_num] = PDFDocs[curr_doc_num + 1];
		num_pages[curr_doc_num] = num_pages[curr_doc_num + 1];
		fileBuffers[curr_doc_num + 1] = tempFB;
		PDFDocs[curr_doc_num + 1] = tempPD;
		num_pages[curr_doc_num + 1] = tempNP;
		// Redraw current position
		await renderPDFPage(mainStruct.current);
		draw();
		updatePageCount();
		renderInProgress = false;
	}
});

// Merge
function action()
{
	clearOutput(outputElement);
	resizeOutput(outputElement);

	(async() =>{
		// Load PDF
		const {PDFDocument} = PDFLib;
		const pdfDoc = await await PDFDocument.create();

		// Copy page by page into a merged doc
		for(const fileBuffer of fileBuffers)
		{
			const pdf = await PDFDocument.load(fileBuffer);
			const copy = await pdfDoc.copyPages(pdf, pdf.getPageIndices());
			copy.forEach((page) => pdfDoc.addPage(page));
		}

		newBytes = await pdfDoc.save();

		// Make bob
		const bob = new Blob([newBytes], {type: 'application/pdf'});
		const link = document.createElement('a');
		link.href = URL.createObjectURL(bob);
		link.download = 'merged' + '.pdf';
		link.click();
		URL.revokeObjectURL(link.href);
	})();
}

// Merge
action_button.addEventListener('click', function()
{
	action();
});