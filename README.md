# PPTX & PDF Document Tools

A beautiful, sleek Flask web application designed to simplify operations on PowerPoint presentations and PDF documents. Featuring a state-of-the-art GUI, this web application acts as your unified hub to perform local manipulations or cloud-based document processing seamlessly.

## ✨ Features

- **Modern UI**: A responsive, colorful web dashboard built with HTML, CSS, and JS.
- **Merge PPTX/PPT**: Combine multiple PowerPoint presentations into a single continuous file.
- **Convert to PDF**: Instantly transform `.ppt` or `.pptx` presentations into PDF files painlessly.
- **Merge PDF**: Concatenate multiple PDF documents together completely losslessly.
- **Choose merge order**: Uploads default to ascending natural filename order (1, 2, 3 … 10). Drag and drop rows to customize the order, or use the up/down keys on a focused row. On touch screens, drag the grip. Use “Sort by name” to restore the default; adding files preserves a custom order. Files merge from top to bottom.
- **Stateless & Scalable**: Files are securely handled, processed in a temporary space, and immediately cleaned up, which keeps your storage free and scales smoothly for multiple users.
- **Docker Ready**: Effortlessly deployable out of the box using Docker to services like Railway, Heroku, Render, or AWS.

## 🚀 Quickstart (Local Run)

1. **Clone the repository & jump in:**
   ```bash
   git clone https://github.com/RecklessSoftwareGuy/pptx-pdf-tools.git
   cd pptx-pdf-tools
   ```

2. **Initialize your Python Environment:**
   ```bash
   python -m venv .venv
   source .venv/bin/activate    # On macOS/Linux (.venv\Scripts\activate on Windows)
   pip install -r requirements.txt
   ```

3. **Start the Web Server:**
   ```bash
   python app.py
   ```
   Open your browser and navigate to `http://localhost:5001`. Use the unified dashboard to drag & drop files!

## 🐳 Running with Docker

Ready for a production environment! Easily isolate and run the application completely using Docker:

```bash
docker build -t document-tools .
docker run -p 5001:5001 document-tools
```

Once it launches, explore your app at `http://localhost:5001`.

## Dependencies

- Python 3.8+
- [Flask](https://flask.palletsprojects.com/)
- [Spire.Presentation](https://www.e-iceblue.com/Introduce/presentation-for-python.html)
- [pypdf](https://pypdf.readthedocs.io/)
