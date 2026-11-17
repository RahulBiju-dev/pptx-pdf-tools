document.addEventListener('DOMContentLoaded', () => {
    let currentFiles = [];
    let currentAction = 'merge_pptx';
    let isProcessing = false;
    let hasCustomOrder = false;
    const filenameOrder = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileList = document.getElementById('file-list');
    const processBtn = document.getElementById('process-btn');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const loading = document.getElementById('loading');
    const errorMsg = document.getElementById('error-msg');
    const orderHint = document.getElementById('order-hint');
    const orderStatus = document.getElementById('order-status');
    
    const sortBtn = document.getElementById('sort-files');
    sortBtn.addEventListener('click', () => {
        if (isProcessing) return;
        hasCustomOrder = false;
        currentFiles.sort((a, b) => filenameOrder.compare(a.name, b.name));
        updateUI();
        orderStatus.textContent = 'Files sorted by name, numbers first in natural order.';
    });

    // Tab Switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isProcessing) return;
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentAction = btn.dataset.action;
            
            // clear files on tab switch
            currentFiles = [];
            hasCustomOrder = false;
            updateUI();
        });
    });

    // Drag and Drop Handlers
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', handleDrop, false);
    fileInput.addEventListener('change', handleFilesSelect, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    function handleFilesSelect(e) {
        handleFiles(e.target.files);
    }

    function handleFiles(files) {
        if (isProcessing) return;
        const fileArray = Array.from(files);
        
        fileArray.forEach(file => {
            const ext = file.name.split('.').pop().toLowerCase();
            
            // Validate based on current action
            if (currentAction === 'merge_pptx' || currentAction === 'convert_pdf') {
                if (ext !== 'pptx' && ext !== 'ppt') {
                    showError('Please upload only .PPTX or .PPT files for this tool.');
                    return;
                }
            } else if (currentAction === 'convert_docx') {
                if (ext !== 'docx' && ext !== 'doc') {
                    showError('Please upload only .DOCX or .DOC files for this tool.');
                    return;
                }
            } else if (currentAction === 'merge_pdf') {
                if (ext !== 'pdf') {
                    showError('Please upload only .PDF files for this tool.');
                    return;
                }
            }
            
            currentFiles.push(file);
        });
        
        if (!hasCustomOrder) currentFiles.sort((a, b) => filenameOrder.compare(a.name, b.name));
        updateUI();
        // Reset file input so same file can be selected again if removed
        fileInput.value = '';
    }

    function updateUI(clearError = true) {
        // Hide error
        if (clearError) errorMsg.classList.add('hidden');
        
        // Render File List
        fileList.innerHTML = '';
        const isMerge = currentAction === 'merge_pptx' || currentAction === 'merge_pdf';
        orderHint.classList.toggle('hidden', !isMerge || currentFiles.length === 0);
        sortBtn.disabled = isProcessing || currentFiles.length < 2;
        currentFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            
            const name = document.createElement('span');
            name.className = 'file-name';
            name.textContent = file.name;

            const controls = document.createElement('div');
            controls.className = 'file-controls';
            if (isMerge) {
                const position = document.createElement('span');
                position.className = 'file-position';
                position.textContent = `${index + 1}.`;
                item.appendChild(position);

                const grip = document.createElement('span');
                grip.className = 'drag-grip';
                grip.textContent = '⠿';
                grip.setAttribute('aria-hidden', 'true');
                grip.title = 'Drag to reorder';
                item.prepend(grip);
                item.classList.toggle('reorderable', !isProcessing);
                item.tabIndex = isProcessing ? -1 : 0;
                item.setAttribute('aria-label', `${file.name}. Use arrow keys to reorder.`);

                item.addEventListener('keydown', event => {
                    if (event.target !== item || isProcessing) return;
                    const direction = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
                    if (!direction) return;
                    event.preventDefault();
                    const target = index + direction;
                    if (target < 0 || target >= currentFiles.length) return;
                    hasCustomOrder = true;
                    currentFiles.splice(target, 0, currentFiles.splice(index, 1)[0]);
                    updateUI();
                    fileList.children[target].focus();
                    orderStatus.textContent = `${file.name} moved to position ${target + 1} of ${currentFiles.length}.`;
                });

                item.draggable = !isProcessing;
                let destination = index;
                const clearMarkers = () => {
                    fileList.querySelectorAll('.drop-before, .drop-after').forEach(row => {
                        row.classList.remove('drop-before', 'drop-after');
                    });
                };
                const locateDrop = clientY => {
                    clearMarkers();
                    const rows = Array.from(fileList.children).filter(row => row !== item);
                    const next = rows.find(row => clientY < row.getBoundingClientRect().top + row.offsetHeight / 2);
                    destination = next ? rows.indexOf(next) : rows.length;
                    if (next) next.classList.add('drop-before');
                    else if (rows.length) rows[rows.length - 1].classList.add('drop-after');
                };
                const finishDrag = commit => {
                    clearMarkers();
                    item.classList.remove('dragging');
                    if (!commit || isProcessing) return;
                    hasCustomOrder = true;
                    currentFiles.splice(destination, 0, currentFiles.splice(index, 1)[0]);
                    updateUI(false);
                    fileList.children[destination].focus();
                    orderStatus.textContent = `${file.name} moved to position ${destination + 1} of ${currentFiles.length}.`;
                };
                item.addEventListener('dragstart', event => {
                    if (isProcessing || event.target.closest('button')) {
                        event.preventDefault();
                        return;
                    }
                    event.stopPropagation();
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', file.name);
                    item.classList.add('dragging');
                    const over = event => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                        locateDrop(event.clientY);
                    };
                    const drop = event => {
                        event.preventDefault();
                        locateDrop(event.clientY);
                        cleanup();
                        finishDrag(true);
                    };
                    const cleanup = () => {
                        fileList.removeEventListener('dragover', over);
                        fileList.removeEventListener('drop', drop);
                    };
                    item.addEventListener('dragend', () => { cleanup(); finishDrag(false); }, { once: true });
                    fileList.addEventListener('dragover', over);
                    fileList.addEventListener('drop', drop);
                });
                // Touch uses the grip so the rest of the row still scrolls normally.
                grip.addEventListener('pointerdown', event => {
                    if (isProcessing || event.pointerType === 'mouse') return;
                    event.preventDefault();
                    const pointerId = event.pointerId;
                    grip.setPointerCapture(pointerId);
                    item.classList.add('dragging');
                    const move = event => {
                        if (event.pointerId === pointerId) locateDrop(event.clientY);
                    };
                    const finish = event => {
                        if (event.pointerId !== pointerId) return;
                        grip.removeEventListener('pointermove', move);
                        grip.removeEventListener('pointerup', finish);
                        grip.removeEventListener('pointercancel', finish);
                        grip.removeEventListener('lostpointercapture', finish);
                        finishDrag(event.type === 'pointerup');
                    };
                    grip.addEventListener('pointermove', move);
                    grip.addEventListener('pointerup', finish);
                    grip.addEventListener('pointercancel', finish);
                    grip.addEventListener('lostpointercapture', finish);
                });
            }
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.type = 'button';
            removeBtn.disabled = isProcessing;
            removeBtn.textContent = 'Remove';
            removeBtn.onclick = () => {
                if (isProcessing) return;
                currentFiles.splice(index, 1);
                updateUI();
            };
            
            item.appendChild(name);
            controls.appendChild(removeBtn);
            item.appendChild(controls);
            fileList.appendChild(item);
        });
        
        // Update Process Button State
        let isValid = false;
        if (currentAction === 'convert_pdf' || currentAction === 'convert_docx') {
            isValid = currentFiles.length > 0;
        } else {
            isValid = currentFiles.length > 1; // Merge requires at least 2
        }
        
        processBtn.disabled = isProcessing || !isValid;
        fileInput.disabled = isProcessing;
        tabBtns.forEach(btn => { btn.disabled = isProcessing; });
        
        if (currentFiles.length > 0 && !isValid) {
            processBtn.textContent = 'Need at least 2 files to merge';
        } else {
            processBtn.textContent = 'Process Files';
        }
    }

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.classList.remove('hidden');
    }

    processBtn.addEventListener('click', async () => {
        if (isProcessing || processBtn.disabled || currentFiles.length === 0) return;
        isProcessing = true;
        updateUI();
        
        // UI Loading State
        loading.classList.remove('hidden');
        processBtn.classList.add('hidden');
        errorMsg.classList.add('hidden');
        dropZone.style.pointerEvents = 'none';
        
        const formData = new FormData();
        currentFiles.forEach(file => {
            formData.append('files', file);
        });
        
        try {
            const url = `/api/${currentAction}`;
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Server error occurred');
            }
            
            // Handle Download
            const blob = await response.blob();
            
            // Use DocTools_{timestamp} as the default filename, extracting extension if available
            let filename = `DocTools_${Date.now()}`;
            const disposition = response.headers.get('content-disposition');
            if (disposition && disposition.indexOf('attachment') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) { 
                    const serverFilename = matches[1].replace(/['"]/g, '');
                    const extIndex = serverFilename.lastIndexOf('.');
                    if (extIndex !== -1) {
                        const ext = serverFilename.substring(extIndex);
                        filename = `DocTools_${Date.now()}${ext}`;
                    }
                }
            }
            
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
            
            // Clear files on success
            currentFiles = [];
            hasCustomOrder = false;
            updateUI();
            
        } catch (err) {
            showError(err.message);
        } finally {
            isProcessing = false;
            updateUI(false);
            loading.classList.add('hidden');
            processBtn.classList.remove('hidden');
            dropZone.style.pointerEvents = 'auto';
        }
    });
});
