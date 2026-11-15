document.addEventListener('DOMContentLoaded', () => {
    let currentFiles = [];
    let currentAction = 'merge_pptx';
    let isProcessing = false;
    
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileList = document.getElementById('file-list');
    const processBtn = document.getElementById('process-btn');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const loading = document.getElementById('loading');
    const errorMsg = document.getElementById('error-msg');
    const orderHint = document.getElementById('order-hint');
    const orderStatus = document.getElementById('order-status');
    
    // Tab Switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isProcessing) return;
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentAction = btn.dataset.action;
            
            // clear files on tab switch
            currentFiles = [];
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
                    currentFiles.splice(target, 0, currentFiles.splice(index, 1)[0]);
                    updateUI();
                    fileList.children[target].focus();
                    orderStatus.textContent = `${file.name} moved to position ${target + 1} of ${currentFiles.length}.`;
                });

                item.addEventListener('pointerdown', event => {
                    if (isProcessing || event.button !== 0 || event.target.closest('button')) return;
                    const pointerId = event.pointerId;
                    const startY = event.clientY;
                    let dragging = false;
                    fileList.setPointerCapture(pointerId);

                    const move = event => {
                        if (event.pointerId !== pointerId) return;
                        if (!dragging && Math.abs(event.clientY - startY) < 5) return;
                        dragging = true;
                        item.classList.add('dragging');
                        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.file-item');
                        if (!target || target === item || target.parentElement !== fileList) return;
                        const rows = Array.from(fileList.children);
                        const from = rows.indexOf(item);
                        const to = rows.indexOf(target);
                        currentFiles.splice(to, 0, currentFiles.splice(from, 1)[0]);
                        fileList.insertBefore(item, from < to ? target.nextSibling : target);
                        Array.from(fileList.children).forEach((row, position) => {
                            row.querySelector('.file-position').textContent = `${position + 1}.`;
                        });
                    };
                    const finish = event => {
                        if (event.pointerId !== pointerId) return;
                        fileList.removeEventListener('pointermove', move);
                        fileList.removeEventListener('pointerup', finish);
                        fileList.removeEventListener('pointercancel', finish);
                        fileList.removeEventListener('lostpointercapture', finish);
                        const position = Array.from(fileList.children).indexOf(item);
                        updateUI(false);
                        fileList.children[position].focus();
                        if (dragging) orderStatus.textContent = `${file.name} moved to position ${position + 1} of ${currentFiles.length}.`;
                    };
                    fileList.addEventListener('pointermove', move);
                    fileList.addEventListener('pointerup', finish);
                    fileList.addEventListener('pointercancel', finish);
                    fileList.addEventListener('lostpointercapture', finish);
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
