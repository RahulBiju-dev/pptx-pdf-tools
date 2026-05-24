import os
import shutil
import tempfile
import io
from flask import Flask, request, send_file, render_template, jsonify
from werkzeug.utils import secure_filename
import core

app = Flask(__name__)
# Allow large uploads for presentations
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024 # 500 MB

@app.route('/')
def index():
    return render_template('index.html')

def process_files(files, action_func):
    if not files or all(f.filename == '' for f in files):
        return jsonify({'error': 'No files uploaded'}), 400
        
    temp_dir = tempfile.mkdtemp()
    input_files = []
    
    try:
        # Save files to temp directory securely
        for f in files:
            if f.filename:
                filename = secure_filename(f.filename)
                file_path = os.path.join(temp_dir, filename)
                f.save(file_path)
                input_files.append(file_path)
                
        # Perform our core logic
        output_path = action_func(input_files, temp_dir)
        
        # Read the generated file into memory so we can safely delete the temp directory immediately
        with open(output_path, 'rb') as fp:
            file_data = fp.read()
            
        file_io = io.BytesIO(file_data)
        file_io.seek(0)
        output_filename = os.path.basename(output_path)
        
        # Determine appropriate mimetype
        mimetype = "application/octet-stream"
        if output_filename.endswith(".pdf"):
            mimetype = "application/pdf"
        elif output_filename.endswith(".pptx"):
            mimetype = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        elif output_filename.endswith(".zip"):
            mimetype = "application/zip"
            
        # Cleanup
        shutil.rmtree(temp_dir, ignore_errors=True)
        
        return send_file(
            file_io, 
            as_attachment=True, 
            download_name=output_filename, 
            mimetype=mimetype
        )
        
    except Exception as e:
        shutil.rmtree(temp_dir, ignore_errors=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/merge_pptx', methods=['POST'])
def handle_merge_pptx():
    files = request.files.getlist('files')
    return process_files(files, core.merge_presentations)
    
@app.route('/api/convert_pdf', methods=['POST'])
def handle_convert_pdf():
    files = request.files.getlist('files')
    return process_files(files, core.convert_presentations_to_pdf)

@app.route('/api/convert_docx', methods=['POST'])
def handle_convert_docx():
    files = request.files.getlist('files')
    return process_files(files, core.convert_docx_to_pdf)

@app.route('/api/merge_pdf', methods=['POST'])
def handle_merge_pdf():
    files = request.files.getlist('files')
    return process_files(files, core.merge_pdfs)

if __name__ == '__main__':
    # Railway passes PORT environment variable
    port = int(os.environ.get("PORT", 5001))
    app.run(host='0.0.0.0', port=port, debug=False)