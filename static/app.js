document.addEventListener('DOMContentLoaded', () => {
    let currentFiles = [];
    let currentAction = 'merge_pptx';
    
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileList = document.getElementById('file-list');
    const processBtn = document.getElementById('process-btn');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const loading = document.getElementById('loading');
    const errorMsg = document.getElementById('error-msg');
    
    // Tab Switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
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

    function updateUI() {
        // Hide error
        errorMsg.classList.add('hidden');
        
        // Render File List
        fileList.innerHTML = '';
        currentFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            
            const name = document.createElement('span');
            name.textContent = file.name;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.textContent = 'Remove';
            removeBtn.onclick = () => {
                currentFiles.splice(index, 1);
                updateUI();
            };
            
            item.appendChild(name);
            item.appendChild(removeBtn);
            fileList.appendChild(item);
        });
        
        // Update Process Button State
        let isValid = false;
        if (currentAction === 'convert_pdf' || currentAction === 'convert_docx') {
            isValid = currentFiles.length > 0;
        } else {
            isValid = currentFiles.length > 1; // Merge requires at least 2
        }
        
        processBtn.disabled = !isValid;
        
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
        if (currentFiles.length === 0) return;
        
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
            
            // Try to extract filename from content-disposition header if present
            let filename = 'download';
            const disposition = response.headers.get('content-disposition');
            if (disposition && disposition.indexOf('attachment') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) { 
                    filename = matches[1].replace(/['"]/g, '');
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
            loading.classList.add('hidden');
            processBtn.classList.remove('hidden');
            dropZone.style.pointerEvents = 'auto';
        }
    });
});
