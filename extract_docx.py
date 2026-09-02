import zipfile
import xml.etree.ElementTree as ET
import sys

def extract_text_from_docx(docx_path):
    namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    text = []
    with zipfile.ZipFile(docx_path) as docx:
        tree = ET.fromstring(docx.read('word/document.xml'))
        for paragraph in tree.findall('.//w:p', namespaces):
            para_text = []
            for run in paragraph.findall('.//w:r', namespaces):
                t = run.find('.//w:t', namespaces)
                if t is not None and t.text:
                    para_text.append(t.text)
            text.append(''.join(para_text))
    return '\n'.join(text)

if __name__ == '__main__':
    docx_file = sys.argv[1]
    out_file = sys.argv[2]
    text = extract_text_from_docx(docx_file)
    with open(out_file, 'w', encoding='utf-8') as f:
        f.write(text)
