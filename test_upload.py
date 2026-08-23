import requests
import io
import sys

def create_dummy_pdf():
    # just create a simple validish string, server mostly checks length
    # but core logic merges, so let's use an empty string as a mock
    # to hit the "Maximum of 15 files" validation which happens before processing
    return b'dummy'

url = "http://127.0.0.1:5001/api/merge_pdf"

def test_files(num_files):
    files = [('files', (f'test{i}.pdf', create_dummy_pdf(), 'application/pdf')) for i in range(num_files)]
    resp = requests.post(url, files=files)
    return resp

print("Testing 15 files...")
r15 = test_files(15)
if r15.status_code == 400 and 'Maximum of 15' in r15.text:
    print("FAILED: 15 files should be allowed but got error:", r15.text)
    sys.exit(1)
elif r15.status_code == 500:
    # 500 is ok because our dummy file is not a valid pdf for pypdf, but we pass the limit check!
    print("15 files passed the length check (got 500 from core merge logic as expected for dummy file).")
else:
    print("15 files passed:", r15.status_code, r15.text)

print("Testing 16 files...")
r16 = test_files(16)
if r16.status_code == 400 and 'Maximum of 15 files allowed per request' in r16.text:
    print("16 files failed as expected!")
else:
    print("FAILED: 16 files should have failed with the maximum files error. Got:", r16.status_code, r16.text)
    sys.exit(1)
