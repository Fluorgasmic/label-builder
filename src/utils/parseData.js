import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export function parseFile(file) {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' });
          const csv = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]], { FS: '\t' });
          const result = Papa.parse(csv.trim(), { delimiter: '\t', header: true, skipEmptyLines: true });
          const headers = result.meta.fields || [];
          const records = result.data.filter((r) =>
            Object.values(r).some((v) => v && v.trim())
          );
          resolve({ headers, records, fileName: file.name });
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const firstLine = text.split('\n')[0];
          let sep = ',';
          if (firstLine.indexOf('\t') >= 0) sep = '\t';
          else if (firstLine.indexOf(';') >= 0) sep = ';';

          const result = Papa.parse(text.trim(), { delimiter: sep, header: true, skipEmptyLines: true });
          const headers = result.meta.fields || [];
          const records = result.data.filter((r) =>
            Object.values(r).some((v) => v && v.trim())
          );
          resolve({ headers, records, fileName: file.name });
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file, 'UTF-8');
    }
  });
}
